# MinIO Storage Migration Guide

This document describes the migration from local disk storage to MinIO (S3-compatible object storage) for production-ready deployment.

## Overview

**Before:** Files stored on local disk → Not scalable, not portable (*Forbidden for production*)
**After:** Files stored in MinIO → Cloud-ready, scalable, production-ready

## Architecture Changes

### Backend File Service

#### Pre-Refactoring (Disk-based)
```
Controller 
    ↓
FileService 
    ↓
FileRepository (Local Disk)
    ↓
Filesystem (/app/uploads/...)
```

#### Post-Refactoring (Domain-Driven Design with MinIO)
```
Controller 
    ↓
FileService (Application Layer)
    ↓
ObjectStoragePort (Domain Contract)
    ↓
MinIOStorageAdapter (Infrastructure Adapter)
    ↓
MinIO (S3-compatible Object Storage)
    ↓
MongoDB (Metadata)
```

### Key Improvements

1. **Domain-Driven Design (DDD)**
   - Separated concerns: domain logic from infrastructure
   - `ObjectStoragePort` interface enables testing and easy switching to different storage providers
   - `FileObject` domain model represents files independent of storage mechanism

2. **Hexagonal Architecture (Ports & Adapters)**
   - Core business logic in domain layer (pure Java)
   - Storage implementation in infrastructure layer (MinIO adapter)
   - Easy to swap MinIO for AWS S3, Azure Blob, or any S3-compatible provider

3. **Entity Changes**
   - `FileMgmt` now stores MinIO-specific fields:
     - `bucket`: S3 bucket name
     - `objectKey`: S3-style key (e.g., "covers/uuid_filename.jpg")
     - `publicUrl`: Direct public URL to object

4. **API Gateway Routing**
   - All file operations routed through API Gateway (port 8888)
   - Clients don't need to know internal service ports
   - Consistent URL structure: `http://gateway/file/media/upload`

## Configuration

### Backend (file-service)

**application.yaml**
```yaml
minio:
  endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
  access-key: ${MINIO_ACCESS_KEY:minioadmin}
  secret-key: ${MINIO_SECRET_KEY:minioadmin}
  bucket-name: ${MINIO_BUCKET_NAME:book-social-network}
  use-ssl: ${MINIO_USE_SSL:false}
  public-url: ${MINIO_PUBLIC_URL:http://localhost:9000}
```

**docker-compose.yml**
```yaml
minio:
  image: minio/minio:RELEASE.2024-03-30T09-40-56Z
  environment:
    - MINIO_ROOT_USER=minioadmin
    - MINIO_ROOT_PASSWORD=minioadmin

file-service:
  environment:
    - MINIO_ENDPOINT=http://minio:9000
    - MINIO_ACCESS_KEY=minioadmin
    - MINIO_SECRET_KEY=minioadmin
    - MINIO_BUCKET_NAME=book-social-network
    - MINIO_PUBLIC_URL=http://localhost:9000
  depends_on:
    minio:
      condition: service_healthy
```

### Web App

**Create .env.local**
```
VITE_API_URL=http://localhost:8888
```

### Mobile App

**Create .env**
```
REACT_APP_API_URL=http://localhost:8888
```

## File structure after refactoring

### Backend File Service
```
file-service/src/main/java/com/chiennc/file/
├── domain/
│   ├── models/
│   │   └── FileObject.java         (Domain Model)
│   ├── ports/
│   │   └── ObjectStoragePort.java  (Domain Contract)
│   └── services/
│       └── FileObjectService.java  (Domain Service - validation logic)
├── infrastructure/
│   ├── config/
│   │   └── MinIOConfig.java        (MinIO Configuration)
│   └── storage/
│       └── MinIOStorageAdapter.java (ObjectStoragePort implementation)
├── entity/
│   └── FileMgmt.java               (MongoDB Persistence)
├── service/
│   └── FileService.java            (Application Service - orchestration)
├── controller/
│   └── FileController.java         (REST Endpoints)
└── ...
```

### Mobile App
```
mobile-app/src/
├── domain/
│   ├── models/
│   │   └── FileObject.ts           (Domain Model)
│   ├── ports/
│   │   └── FileStoragePort.ts      (Domain Contract)
│   └── services/
│       └── FileObjectService.ts    (Domain Service)
├── infrastructure/
│   └── api/
│       ├── axiosClient.ts          (HTTP Client)
│       └── FileStorageApiAdapter.ts (ObjectStoragePort Implementation)
└── api/
    └── fileApi.ts                   (Public Facade)
```

### Web App  
```
web-app/src/
├── api/
│   ├── axiosClient.ts              (HTTP Client - refactored)
│   └── fileApi.ts                  (File operations - new)
└── ...
```

## Migration Steps

### 1. Deploy MinIO
```bash
# MinIO is already in docker-compose.yml
docker-compose up -d minio

# Verify MinIO is running
docker logs minio | grep "Cluster is running"

# Access MinIO Console: http://localhost:9001
#   Username: minioadmin
#   Password: minioadmin
```

### 2. Build and Deploy File Service
```bash
# Build with new MinIO adapter
docker-compose build --no-cache file-service

# Start file service
docker-compose up -d file-service

# Verify service started
docker logs file-service | grep "MinIO client initialized"
```

### 3. Migrating Existing Data (Optional)

If you have existing files in local disk, migrate to MinIO:

```bash
# Start a migration utility (create this if needed)
java -cp file-service.jar com.chiennc.file.migration.MinIOMigrationTool \
  --source-dir=/app/uploads \
  --minio-endpoint=http://minio:9000 \
  --bucket=book-social-network
```

### 4. Update Mobile App

```bash
# Update .env variables
REACT_APP_API_URL=http://localhost:8888

# Build and deploy
npm install
npm run build
```

### 5. Update Web App

```bash
# Update .env.local variables
VITE_API_URL=http://localhost:8888

# Build and deploy
npm install
npm run build
```

## API Examples

### Upload File

**Request:**
```bash
curl -X POST http://localhost:8888/file/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@image.jpg" \
  -F "type=covers"
```

**Response:**
```json
{
  "result": {
    "originalFileName": "image.jpg",
    "url": "http://localhost:9000/book-social-network/covers/uuid_image.jpg",
    "fileId": "507f1f77bcf86cd799439011",
    "size": 1024000,
    "contentType": "image/jpeg",
    "uploadedAt": 1712592600000
  }
}
```

### Download File

**Request:**
```bash
curl -X GET http://localhost:8888/file/media/download/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>" \
  -o downloaded_image.jpg
```

### Delete File

**Request:**
```bash
curl -X DELETE http://localhost:8888/file/media/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

## Production Deployment

### For AWS S3

1. Update `MinIOConfig.java` endpoint:
```java
String endpoint = "https://s3.amazonaws.com";
MinioClient.builder()
    .endpoint(endpoint)
    .credentials(awsAccessKey, awsSecretKey)
    .build();
```

2. Update environment variables:
```bash
MINIO_ENDPOINT=https://s3.amazonaws.com
MINIO_ACCESS_KEY=<AWS_ACCESS_KEY>
MINIO_SECRET_KEY=<AWS_SECRET_KEY>
MINIO_BUCKET_NAME=book-social-network-prod
MINIO_PUBLIC_URL=https://s3.amazonaws.com/book-social-network-prod
```

### For Azure Blob Storage

Create an `AzureblobStorageAdapter.java` implementing `ObjectStoragePort`.

### For Google Cloud Storage

Create a `GoogleCloudStorageAdapter.java` implementing `ObjectStoragePort`.

The beauty of this architecture is that **no changes required in application code**—just swap the adapter!

## Benefits

✅ **No local disk dependency** - Works in containerized/serverless environments
✅ **Scalable** - Can store unlimited files
✅ **Portable** - Easy migration between providers
✅ **Testable** - Domain contracts make unit testing easy
✅ **Maintainable** - Clear separation of concerns
✅ **Production-ready** - Follows industry best practices
✅ **Cloud-native** - Ready for Kubernetes, AWS ECS, etc.

## Troubleshooting

### Issue: MinIO bucket creation timeout
```
Solution: Ensure MinIO container is fully started
docker-compose logs minio
docker-compose restart minio
```

### Issue: File upload returns 413 (Payload Too Large)
```
Solution: Increase max upload size in nginx or application.yaml
spring.servlet.multipart.max-file-size=100MB
spring.servlet.multipart.max-request-size=100MB
```

### Issue: Can't download file from MinIO
```
Solution: Check MINIO_PUBLIC_URL is correct and accessible from client
DockerConfig: MINIO_PUBLIC_URL=http://localhost:9000 (for local)
             MINIO_PUBLIC_URL=https://minio.example.com (for production)
```

## Links & References

- [MinIO Documentation](https://min.io/docs/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Hexagonal Architecture](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
- [S3 API Compatibility](https://min.io/docs/minio/linux/administration/object-management/s3-compatibility.html)
