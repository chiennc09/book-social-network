package com.chiennc.file.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MinIO Configuration
 * Manages connection to MinIO object storage, creates the bucket if absent,
 * and applies a public-read policy so mobile clients can access files directly.
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(MinIOConfig.MinIOProperties.class)
public class MinIOConfig {

    /**
     * Public-read bucket policy template (S3 compatible).
     * Allows anonymous GET on every object inside the bucket.
     */
    private static String buildPublicReadPolicy(String bucketName) {
        return String.format(
                """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """,
                bucketName);
    }

    /**
     * Create MinioClient bean.
     * MinioClient is thread-safe and should be reused across the application.
     */
    @Bean
    public MinioClient minioClient(MinIOProperties properties) {
        log.info("Initializing MinIO client: endpoint={}, bucket={}", properties.endpoint, properties.bucketName);

        MinioClient client = MinioClient.builder()
                .endpoint(properties.endpoint)
                .credentials(properties.accessKey, properties.secretKey)
                .build();

        try {
            boolean found = client.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(properties.bucketName)
                            .build());

            if (!found) {
                log.info("Creating MinIO bucket: {}", properties.bucketName);
                client.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(properties.bucketName)
                                .build());
                log.info("Bucket created: {}", properties.bucketName);
            } else {
                log.info("MinIO bucket already exists: {}", properties.bucketName);
            }

            // Apply public-read policy so mobile clients can fetch files without auth
            String policy = buildPublicReadPolicy(properties.bucketName);
            client.setBucketPolicy(
                    SetBucketPolicyArgs.builder()
                            .bucket(properties.bucketName)
                            .config(policy)
                            .build());
            log.info("Public-read policy applied to bucket: {}", properties.bucketName);

        } catch (Exception e) {
            // Non-fatal: service still starts; bucket may exist or policy already set
            log.warn("Failed to initialise MinIO bucket/policy (will retry on next upload): {}", e.getMessage());
        }

        log.info("MinIO client initialised successfully");
        return client;
    }

    /**
     * MinIO Configuration Properties — loaded from application.yaml minio.*
     */
    @ConfigurationProperties(prefix = "minio")
    @Data
    @NoArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MinIOProperties {
        String endpoint;
        String accessKey;
        String secretKey;
        String bucketName;
        boolean useSsl;
        // publicUrl removed — file-service now returns relative objectKeys only.
        // Clients (mobile/web/admin) build the full URL from their own MINIO_PUBLIC_URL config.
    }
}
