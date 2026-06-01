# 🚀 Docker Quick Start Guide

**Run this from the project root directory: `e:\Project\book-social-network`**

## ⚡ Quick Commands

### 1. Initial Setup (First Time Only)
```bash
# Ensure all host databases are running
# - MySQL on localhost:3306 (user: root, password: root)
# - MongoDB on localhost:27017 (user: root, password: root) 
# - Neo4j on localhost:7687 (user: neo4j, password: 12345678)

# Create upload directories
mkdir -p upload/covers upload/epubs upload/pdfs upload/avatars

# Build all Docker images
docker-compose build --progress=plain
```

### 2. Start Everything
```bash
# Start all services in background
docker-compose up -d

# Wait 30-60 seconds for services to be ready
# Check status:
docker-compose ps
```

### 3. Verify Services are Running
```bash
# Check if Kafka is healthy
docker-compose logs kafka | grep "Kafka started\|Cluster ID"

# Test API Gateway (should return 200 OK or 404)
curl http://localhost:8888/identity/health

# Test a few services
curl http://localhost:8080/identity/health
curl http://localhost:8091/profile/health
```

### 4. Stop Everything
```bash
# Stop all containers (keep data)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## 🔧 Rebuild After Code Changes

```bash
# Rebuild one service (using cache)
docker-compose build identity-service
docker-compose up -d identity-service

# Or in one command
docker-compose up -d --build identity-service

# For Python service (recommendation)
docker-compose build recommendation-service
docker-compose up -d recommendation-service
```

## 📋 Pre-Flight Checklist

- [ ] MySQL running on localhost:3306
- [ ] MongoDB running on localhost:27017
- [ ] Neo4j running on localhost:7687
- [ ] upload/ directory exists
- [ ] Docker Desktop running
- [ ] Port 3306, 27017, 7687 are not blocked
- [ ] No containers already using ports 8080-8888, 9094, 6379, 6333

## 🆘 Quick Troubleshooting

| Problem | Command |
|---------|---------|
| "Cannot connect to Docker daemon" | Restart Docker Desktop |
| "Cannot connect to host.docker.internal" | Ensure host databases are actually running |
| "Kafka connection refused" | `docker-compose logs kafka` - wait for "Kafka started" |
| "MongoDB connection failed" | `docker-compose logs notification-service` |
| "Port already in use" | Check what's using the port: `netstat -ano` |
| "Out of disk space" | `docker system prune -a` |
| Container crashes on startup | `docker-compose logs <service>` |

## 📊 Useful Commands

```bash
# View real-time logs of all services
docker-compose logs -f

# View logs of specific service
docker-compose logs -f identity-service

# View only last 50 lines
docker-compose logs --tail=50

# Get container ID
docker-compose ps

# Execute command in container
docker exec identity-service bash -c "ls -la /app"

# Enter container shell
docker exec -it identity-service bash

# Check resource usage
docker stats

# See Docker disk usage
docker system df

# List all networks
docker network ls

# Inspect docker-compose network
docker network inspect book-social-network_default
```

## 🐛 Debug Kafka Issues

```bash
# Check Kafka is running
docker-compose ps kafka

# View Kafka logs
docker-compose logs kafka

# List Kafka topics
docker exec kafka /opt/bitnami/kafka/bin/kafka-topics.sh --list --bootstrap-server kafka:9092

# Create topics manually if needed
docker exec kafka /opt/bitnami/kafka/bin/kafka-topics.sh --create \
  --bootstrap-server kafka:9092 \
  --topic user-behavior-events \
  --if-not-exists

# Test Kafka connection from inside a container
docker exec identity-service bash -c "nc -zv kafka 9092"
```

## 🆔 Service Ports Reference

All services are accessible via API Gateway (http://localhost:8888):
- `/identity/**` → identity-service:8080
- `/profile/**` → profile-service:8091
- `/post/**` → post-service:8083
- `/books/**` → book-service:8085
- `/chat/**` → chat-service:8086
- `/file/**` → file-service:8084
- `/notification/**` → notification-service:8082

Or access services directly:
- http://localhost:8080 - Identity Service
- http://localhost:8091 - Profile Service
- http://localhost:8083 - Post Service
- http://localhost:8085 - Book Service
- http://localhost:8086 - Chat Service
- http://localhost:8084 - File Service
- http://localhost:8082 - Notification Service
- http://localhost:8088 - Recommendation Service

## 📝 Notes

- **First startup may take 2-3 minutes** while:
  - Docker pulls base images
  - Building Maven projects (Spring Boot)
  - Building Python environment
  - Kafka starts up
  
- **All environment variables are now configurable** via docker-compose.yml
  
- **Services automatically retry** if dependencies aren't ready (thanks to `depends_on` and `healthchecks`)

---

**See DOCKER_SETUP.md for detailed troubleshooting and architecture overview**
