# File Storage Refactoring: Disk → MinIO (Domain-Driven Design)

## 🎯 Summary

Refactored entire file storage system from **local disk** (forbidden in production) to **MinIO** (S3-compatible object storage) with production-grade architecture using **Domain-Driven Design** and **Hexagonal Architecture** patterns.

## 📋 What Was Changed

### Backend (Java/Spring Boot)

#### File Service - Complete Refactoring
- ✅ **Removed** `FileRepository` (disk-based storage)
- ✅ **Added** Domain-Driven Design structure:
  - `domain/models/FileObject.java` - Pure domain model
  - `domain/ports/ObjectStoragePort.java` - Contract for storage operations
  - `domain/services/FileObjectService.java` - Domain business logic
  - `infrastructure/config/MinIOConfig.java` - MinIO configuration
  - `infrastructure/storage/MinIOStorageAdapter.java` - MinIO implementation of ObjectStoragePort

#### Updates to Existing Classes
- `FileService.java` - Now uses `ObjectStoragePort` instead of `FileRepository`
- `FileController.java` - Cleaner error handling, updated endpoints
- `FileMgmt.java` - Extended with MinIO fields (bucket, objectKey, publicUrl)
- `FileMgmtMapper.java` - Enhanced to map between domain and persistence models
- `application.yaml` - MinIO configuration with environment variables

#### Dependencies
- ✅ Added `io.minio:minio:8.5.10` to `pom.xml`

#### Docker Compose
- ✅ Added MinIO service with health checks
- ✅ Updated file-service configuration with MinIO env vars
- ✅ Removed volume mount (storage now in MinIO)

### Mobile App (React Native / TypeScript)

#### New Domain Structure
- ✅ `domain/models/FileObject.ts` - File domain model
- ✅ `domain/ports/FileStoragePort.ts` - Storage contract
- ✅ `domain/services/FileObjectService.ts` - Domain validation logic
- ✅ `infrastructure/api/FileStorageApiAdapter.ts` - API implementation
- ✅ `infrastructure/api/axiosClient.ts` - Refactored HTTP client

#### Updated Files
- `api/fileApi.ts` - Redesigned as clean facade
- `.env.example` - Configuration templates

### Web App (React / TypeScript / Vite)

#### Refactored Files
- ✅ `api/axiosClient.ts` - Improved with environment variables
- ✅ `api/fileApi.ts` - New file operations API
- ✅ `.env.example` - Configuration template

## 🏗️ Architecture Decisions

### Domain-Driven Design (DDD)

**Why?** Separates business logic from infrastructure details

```
┌─────────────────────────────────────────┐
│          Domain Layer                   │
│  ┌─────────────────────────────────┐   │
│  │ FileObject (Domain Model)       │   │
│  │ ObjectStoragePort (Contract)    │   │
│  │ FileObjectService (Logic)       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↑          ↑
              │          │
    ┌─────────┴──────────┴────────────────┐
    │   Infrastructure Layer              │
    │  ┌──────────────────────────────┐   │
    │  │ MinIOStorageAdapter          │   │
    │  │ (ObjectStoragePort impl)     │   │
    │  └──────────────────────────────┘   │
    │              ↓                       │
    │  ┌──────────────────────────────┐   │
    │  │ MinIO (S3 Compatible)        │   │
    │  └──────────────────────────────┘   │
    └─────────────────────────────────────┘
```

### Hexagonal Architecture (Ports & Adapters)

**Why?** Makes system testable and replaceable

- **Port**: `ObjectStoragePort` (interface)
- **Adapter**: `MinIOStorageAdapter` (implementation)
- **Alternative**: Could easily swap to AWS S3, Azure Blob, Google Cloud Storage

Benefits:
- ✅ Easy to unit test (mock the port)
- ✅ Switch storage providers without changing business logic
- ✅ Technology-agnostic domain model

## 🔄 How It Works Now

### File Upload Flow

```
┌──────────────────────────┐
│  Client (Mobile/Web)     │
│  Sends file to upload    │
└──────────────┬───────────┘
               │
               ↓
      ┌────────────────────────────┐
      │ API Gateway (8888)         │
      │ Routes to file-service     │
      └────────┬───────────────────┘
               │
               ↓
      ┌────────────────────────────┐
      │ FileController             │
      │ POST /file/media/upload    │
      └────────┬───────────────────┘
               │
               ↓
      ┌────────────────────────────┐
      │ FileService                │
      │ (Application Layer)        │
      │ uploadFile()               │
      └────────┬───────────────────┘
               │
               ├─────────────────────────┐
               │                         │
               ↓                         ↓
      ┌──────────────────┐    ┌──────────────────┐
      │ ObjectStoragePort│    │ FileMgmtRepository
      │ (Domain Contract)│    │ (MongoDB)
      └────────┬─────────┘    └──────────────────┘
               │
               ↓
      ┌────────────────────────────┐
      │ MinIOStorageAdapter        │
      │ (Infrastructure impl)      │
      └────────┬───────────────────┘
               │
               ↓
       ┌───────────────┐
       │ MinIO (S3)    │
       │ Stores file   │
       │ Bucket: book-│
       │ social-ntwrk  │
       └───────────────┘
```

### File Download Flow

```
Client (wants file_id)
        ↓
  API Gateway (8888)
        ↓
  FileController
  GET /file/media/download/{fileId}
        ↓
  FileService.download(fileId)
        ↓
  FileMgmtRepository.findById()
  (Get metadata from MongoDB)
        ↓
  ObjectStoragePort.downloadFile()
        ↓
  MinIOStorageAdapter
  (Fetch from MinIO)
        ↓
  MinIO S3 bucket
        ↓
  Resource → Client
```

## 🚀 Quick Start

### 1. Start MinIO with Docker Compose

```bash
cd e:\Project\book-social-network

# MinIO is already configured - just start it
docker-compose up -d minio

# Verify MinIO is running
docker logs minio | grep "Cluster is running"

# Access console: http://localhost:9001
# User: minioadmin
# Pass: minioadmin
```

### 2. Build & Run File Service

```bash
# Build with Maven
docker-compose build --no-cache file-service

# Start service
docker-compose up -d file-service

# Verify
docker logs file-service | grep "MinIO client initialized"
curl http://localhost:8888/file/media/upload -X POST -F "file=@test.txt" -F "type=others" -H "Authorization: Bearer <token>"
```

### 3. Configure & Run Mobile App

```bash
cd mobile-app

# Copy and update .env
cp .env.example .env
# Edit .env and set REACT_APP_API_URL=http://localhost:8888

# Install and run
npm install
npx react-native run-android
# or
npx react-native run-ios
```

### 4. Configure & Run Web App

```bash
cd web-app

# Copy and update .env.local
cp .env.example .env.local
# Edit .env.local and set VITE_API_URL=http://localhost:8888

# Install and run
npm install
npm run dev
```

## 📊 File Structure Changes

### Before
```
file-service/
├── repository/
│   ├── FileRepository.java      ← REMOVED
│   ├── FileMgmtRepository.java
├── service/
│   └── FileService.java         ← REFACTORED
├── entity/
│   └── FileMgmt.java            ← EXTENDED
└── controller/
    └── FileController.java      ← SIMPLIFIED
```

### After
```
file-service/
├── domain/
│   ├── models/
│   │   └── FileObject.java      ← NEW
│   ├── ports/
│   │   └── ObjectStoragePort.java ← NEW
│   └── services/
│       └── FileObjectService.java ← NEW
├── infrastructure/
│   ├── config/
│   │   └── MinIOConfig.java     ← NEW
│   └── storage/
│       └── MinIOStorageAdapter.java ← NEW
├── repository/
│   ├── FileRepository.java      ← REMOVED
│   └── FileMgmtRepository.java  ← Updated
├── service/
│   └── FileService.java         ← Refactored to use port
├── entity/
│   └── FileMgmt.java            ← Extended with MinIO fields
└── controller/
    └── FileController.java      ← Updated endpoints
```

## 🧪 Testing

### Unit Test Example

```java
@Test
void testUploadFile() {
    // Arrange
    ObjectStoragePort mockStorage = mock(ObjectStoragePort.class);
    FileService fileService = new FileService(mockStorage, mockRepository, mockMapper);
    
    MultipartFile file = new MockMultipartFile("test.jpg", "test".getBytes());
    
    // Act
    FileResponse response = fileService.uploadFile(file, "covers");
    
    // Assert
    verify(mockStorage).uploadFile(any(), any());
    assertEquals("test.jpg", response.getOriginalFileName());
}
```

### Integration Test

```bash
# Start all services
docker-compose up -d

# Create test file
echo "test content" > test.txt

# Upload
curl -X POST http://localhost:8888/file/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.txt" \
  -F "type=others"

# Result: Get fileId and public URL
{
  "result": {
    "originalFileName": "test.txt",
    "url": "http://localhost:9000/book-social-network/others/uuid_test.txt",
    "fileId": "..." 
  }
}
```

## 🔒 Security Notes

- ✅ JWT token verification on all endpoints
- ✅ File category validation (prevents directory traversal)
- ✅ Configurable max file size (defaults 5MB for file-service)
- ✅ MinIO credentials configurable via env vars
- ✅ S3-style keys prevent path traversal attacks

### Production Recommendations

1. **Use AWS S3 or MinIO in production**, not local disk
2. **Set strong credentials** for MinIO:
   ```bash
   MINIO_ROOT_USER=<strong-username>
   MINIO_ROOT_PASSWORD=<strong-password>
   ```

3. **Enable HTTPS/SSL** for MinIO:
   ```yaml
   MINIO_USE_SSL: true
   MINIO_PUBLIC_URL: https://minio.yourdomain.com
   ```

4. **Set storage quotas** to prevent abuse

5. **Enable versioning** in MinIO for data protection

## 📚 References

- [MinIO Documentation](https://min.io/docs/)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [Hexagonal Architecture](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
- [Spring Boot Best Practices](https://spring.io/guides)
- [Design Patterns in Java](https://refactoring.guru/design-patterns/java)

## 🐛 Troubleshooting

### MinIO healthcheck failing
```
Solution: Check if MinIO service has full startup time
docker-compose logs minio
docker-compose restart minio --timeout 60
```

### File uploads return 401 Unauthorized
```
Solution: Ensure JWT token is valid and passed in Authorization header
Authorization: Bearer <valid_jwt_token>
```

### Can't connect to MinIO from file-service
```
Solution: Verify Docker network - use service name "minio"
MINIO_ENDPOINT=http://minio:9000  (not localhost!)
```

### Files not persisting across container restarts
```
Solution: MinIO data volume should be persistent
Verify in docker-compose.yml:
volumes:
  minio_data:/minio/data
```

##  ✅ Checklist

- ✅ Backend refactored to DDD with MinIO
- ✅ Mobile app refactored with domain structure
- ✅ Web app refactored with clean API
- ✅ docker-compose updated with MinIO
- ✅ Configuration with environment variables
- ✅ .env templates created
- ✅ Comprehensive documentation
- ✅ Error handling and validation
- ✅ API Gateway routing configured
- ✅ Production-ready architecture

## 🎉 Status: **Complete & Production-Ready**

All code is now:
- ✅ Production-grade
- ✅ Cloud-native
- ✅ Properly architected
- ✅ Well-documented
- ✅ Easy to maintain and extend

---

**Last Updated:** April 8, 2026  
**Status:** Ready for Deployment to Production
