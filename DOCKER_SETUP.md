# 🐳 Docker Setup Guide - Book Social Network

## Overview
Hướng dẫn cấu hình đầy đủ Docker để chạy toàn bộ project locally.

## ✅ Prerequisites

Đảm bảo đã cài đặt:
- **Docker Desktop** (version >= 4.0)
- **Docker Compose** (version >= 3.8)
- **Databases on host machine** (MySQL, MongoDB, Neo4j chạy locally, KHÔNG trong Docker)

## 📊 Architecture

```
┌─────────────────────────────────────────────────┐
│           DOCKER NETWORK                        │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │  INFRASTRUCTURE                           │  │
│  │  - Kafka (kafka:9092) [internal only]    │  │
│  │  - Redis (redis:6379)                    │  │
│  │  - Qdrant (qdrant:6333)                  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  MICROSERVICES (Spring Boot + Python)    │  │
│  │  - identity-service:8080                 │  │
│  │  - profile-service:8091                  │  │
│  │  - post-service:8083                     │  │
│  │  - book-service:8085                     │  │
│  │  - chat-service:8086                     │  │
│  │  - file-service:8084                     │  │
│  │  - notification-service:8082             │  │
│  │  - recommendation-service:8000           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  API Gateway (localhost:8888)            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         ↓ (via host.docker.internal)
┌─────────────────────────────────────────────────┐
│        HOST MACHINE (Windows/Mac/Linux)         │
├─────────────────────────────────────────────────┤
│  - MySQL (port 3306)                            │
│  - MongoDB (port 27017)                         │
│  - Neo4j (port 7687)                            │
│  - File Storage (/upload)                       │
└─────────────────────────────────────────────────┘
```

## 🚀 Step 1: Ensure Host Databases are Running

### MySQL
```bash
# Kiểm tra MySQL đang chạy trên localhost:3306
mysql -u root -p -e "SELECT VERSION();"
```

**Cần tạo database:**
```sql
CREATE DATABASE IF NOT EXISTS identity_service;
CREATE DATABASE IF NOT EXISTS book_service;
CREATE DATABASE IF NOT EXISTS notification_service;
CREATE DATABASE IF NOT EXISTS post_service;
CREATE DATABASE IF NOT EXISTS file_service;
CREATE DATABASE IF NOT EXISTS chat_service; 
```

### MongoDB (nếu chưa chạy)
```bash
# Windows: Thêm MongoDB service hoặc chạy manually
mongod
```

**Verify connection:**
```bash
mongo --authenticationDatabase admin -u root -p root
```

### Neo4j (nếu chưa chạy)
```bash
# Làm theo hướng dẫn tại https://neo4j.com/download/
# Hoặc dùng Docker riêng:
docker run -d \
  --name neo4j \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/12345678 \
  neo4j:latest
```

## 🔨 Step 2: Build All Services

```bash
# Navigate to project root
cd e:\Project\book-social-network

# Build tất cả images
docker-compose build --progress=plain

# Hoặc build riêng service (nếu có lỗi):
docker-compose build --progress=plain identity-service
docker-compose build --progress=plain recommendation-service
```

## ▶️ Step 3: Start All Containers

### Option A: Start Everything (khuyến nghị)
```bash
docker-compose up -d
```

### Option B: Start Infrastructure First (nếu gặp issues)
```bash
# Phase 1: Infrastructure
docker-compose up -d kafka redis qdrant

# Chờ Kafka ready (check logs)
docker-compose logs kafka | grep "Kafka started"

# Phase 2: Services
docker-compose up -d identity-service profile-service
docker-compose up -d post-service book-service file-service chat-service notification-service
docker-compose up -d recommendation-service api-gateway
```

## 🔍 Step 4: Verify Everything is Running

```bash
# View all containers
docker-compose ps

# Expected output:
# NAME                      STATUS
# kafka                      Up (healthy)
# redis                      Up (healthy)
# qdrant                     Up
# identity-service           Up
# profile-service            Up
# post-service               Up
# book-service               Up
# file-service               Up
# chat-service               Up
# notification-service       Up
# recommendation-service     Up
# api-gateway                Up
```

### Check Service Health

```bash
# Check Kafka
docker-compose logs kafka | tail -20

# Check API Gateway (should route all requests)
curl http://localhost:8888/identity/health

# Check Redis
docker exec redis redis-cli ping

# Check individual services
curl http://localhost:8080/identity/health      # Identity
curl http://localhost:8091/profile/health       # Profile
curl http://localhost:8083/post/health          # Post
curl http://localhost:8085/books/health         # Book
curl http://localhost:8086/chat/health          # Chat
curl http://localhost:8084/file/health          # File
curl http://localhost:8082/notification/health  # Notification
curl http://localhost:8088/api/v1/health        # Recommendation
```

## 📝 Step 5: Important Configurations

### Kafka Topic Creation
Nếu topics không được tạo auto, hãy tạo manually:

```bash
docker exec kafka /opt/bitnami/kafka/bin/kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic user-behavior-events \
  --partitions 1 \
  --replication-factor 1 \
  --if-not-exists

docker exec kafka /opt/bitnami/kafka/bin/kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic book-events \
  --partitions 1 \
  --replication-factor 1 \
  --if-not-exists
```

### Upload Directory
Hãy tạo thư mục upload nếu chưa có:
```bash
mkdir -p upload/covers
mkdir -p upload/epubs
mkdir -p upload/pdfs
mkdir -p upload/avatars
```

## 🐛 Troubleshooting

### Issue 1: "Cannot connect to host.docker.internal"

**Nguyên nhân:** Docker không thể kết nối tới host machine

**Giải pháp:**
```bash
# Kiểm tra trong container
docker exec identity-service ping host.docker.internal

# Windows: Thường OK (built-in)
# Mac/Linux: Cần add extra_hosts manualy (đã có trong docker-compose.yml)

# Nếu vẫn lỗi, kiểm tra host IP:
ipconfig getifaddr en0  # Mac
hostname -I            # Linux
ipconfig                # Windows - dùng local IP thay vì host.docker.internal
```

**Alternative (thay host.docker.internal bằng IP):**
```yaml
# Nếu host IP là 192.168.1.100:
extra_hosts:
  - "host.docker.internal:192.168.1.100"
```

### Issue 2: "Kafka: Connection refused on localhost:9092"

**Nguyên nhân:** Services cố kết nối tới `localhost` thay vì `kafka`

**Kiểm tra:**
```bash
# Đảm bảo tất cả application.yaml dùng env variables:
docker-compose logs identity-service | grep "SPRING_KAFKA_BOOTSTRAP_SERVERS"
```

**Giải pháp:** Tất cả YAML files đã được update với `${SPRING_KAFKA_BOOTSTRAP_SERVERS:localhost:9092}`

### Issue 3: "MongoDB authentication failed"

**Nguyên nhân:** Credentials sai hoặc MongoDB chưa ready

**Kiểm tra:**
```bash
# Test MongoDB connection
mongo --authenticationDatabase admin -u root -p root localhost:27017/post-service

# Hoặc từ Docker:
docker exec post-service bash -c "nc -zv host.docker.internal 27017"
```

### Issue 4: "file-service: No such file or directory /app/uploads"

**Nguyên nhân:** Upload directory chưa được tạo trên host

**Giải pháp:**
```bash
# Tạo directories
mkdir -p upload/covers
mkdir -p upload/epubs
mkdir -p upload/pdfs
mkdir -p upload/avatars

# Set permissions
chmod -R 755 upload
```

### Issue 5: "recommendation-service: ModuleNotFoundError"

**Nguyên nhân:** Dependencies chưa được install

**Kiểm tra:**
```bash
# Kiểm tra build log
docker-compose logs recommendation-service | grep "ERROR\|error\|Failed"

# Rebuild:
docker-compose build --no-cache recommendation-service
```

### Issue 6: API Gateway routes không hoạt động

**Nguyên nhân:** Services chưa ready khi gateway start

**Giải pháp:**
```bash
# Restart API Gateway
docker-compose restart api-gateway

# Hoặc:
docker-compose down api-gateway
docker-compose up -d api-gateway
```

## 📊 Monitoring & Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f identity-service
docker-compose logs -f kafka

# Real-time monitoring
docker stats

# Enter container shell
docker exec -it identity-service bash
docker exec -it recommendation-service bash
```

## 🛑 Cleanup

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Remove specific container
docker-compose rm -f identity-service

# Prune unused images
docker image prune -f
```

## 🔄 Rebuild & Restart

```bash
# Khi code thay đổi, rebuild service:
docker-compose build --no-cache identity-service
docker-compose up -d identity-service

# Hoặc một lệnh:
docker-compose up -d --build identity-service
```

## 📱 Access Services

| Service | URL | Port |
|---------|-----|------|
| API Gateway | http://localhost:8888 | 8888 |
| Identity | http://localhost:8080 | 8080 |
| Profile | http://localhost:8091 | 8091 |
| Post | http://localhost:8083 | 8083 |
| Book | http://localhost:8085 | 8085 |
| Chat | http://localhost:8086 | 8086 |
| File | http://localhost:8084 | 8084 |
| Notification | http://localhost:8082 | 8082 |
| Recommendation | http://localhost:8088 | 8088 |
| Kafka | localhost:9092 | 9092 |
| Redis | localhost:6379 | 6379 |
| Qdrant | http://localhost:6333 | 6333 |

## ✨ Best Practices

1. **Always check Kafka health first** - nó phức tạp nhất
2. **Use named volumes** - để persist data giữa restarts
3. **Set resource limits** - để tránh Docker sử dụng quá nhiều
4. **Enable healthchecks** - tất cả infrastructure services đều có

## 🚨 Resources

Thêm resource limits vào docker-compose.yml nếu cần:
```yaml
services:
  identity-service:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

**Notes:**
- `host.docker.internal` tự động resolve tới host machine IP trong Docker Desktop
- Tất cả services sử dụng environment variables với defaults cho local development
- Kafka uses internal network (kafka:9092) và external listener (localhost:9094) cho clients
