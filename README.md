# Book Social Network

A comprehensive **microservices-based social network platform** for book lovers, built with **Spring Boot**, **FastAPI**, **React**, and **React Native**.

## 📚 Project Overview

This is a full-stack application featuring:
- Multiple **microservices** (Identity, Profile, Post, Book, Chat, File, Notification, Recommendation)
- **Real-time messaging** with Kafka
- **API Gateway** for routing
- **React** web application
- **React Native** mobile application
- **MongoDB, MySQL, Neo4j** databases
- **Redis** caching & **Qdrant** vector DB for ML recommendations
- **Docker Compose** orchestration

---

## 🚀 Quick Start with Docker

### Prerequisites
Before starting, ensure you have:
- ✅ **Docker Desktop** (version 4.0+)
- ✅ **Docker Compose** (included with Docker Desktop)
- ✅ **Host Databases Running:**
  - MySQL on `localhost:3306` (user: `root`, password: `root`)
  - MongoDB on `localhost:27017` (user: `root`, password: `root`)
  - Neo4j on `localhost:7687` (user: `neo4j`, password: `12345678`)

### Step 1: Prepare Environment

```bash
# Navigate to project root
cd e:\Project\book-social-network

# Create required directories
mkdir -p upload/covers upload/epubs upload/pdfs upload/avatars
```

### Step 2: Build Docker Images

```bash
docker-compose build --progress=plain
```

### Step 3: Start All Services

```bash
# Start everything in background
docker-compose up -d

# Wait 30-60 seconds for services to initialize...
```

### Step 4: Verify Everything is Running

```bash
# Check all containers
docker-compose ps

# Test API Gateway
curl http://localhost:8888/identity/health
```

✅ **Done!** Your entire microservices stack is now running!

---

## 📖 Detailed Documentation

For comprehensive setup, troubleshooting, and monitoring:

- **[DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)** - Quick commands and common operations
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Detailed guide, architecture, and troubleshooting

---

## 🏗️ Services Overview

### Infrastructure
- **Kafka** - Event streaming (port 9092)
- **Redis** - Caching layer (port 6379)
- **Qdrant** - Vector database (port 6333)

### Core Services

| Service | Port | Purpose |
|---------|------|---------|
| **Identity Service** | 8080 | Authentication, JWT, User credentials |
| **Profile Service** | 8091 | User profiles, relationships (Neo4j) |
| **Book Service** | 8085 | Book catalog, ISBN, metadata |
| **Post Service** | 8083 | User posts, feeds (MongoDB) |
| **Chat Service** | 8086 | Real-time messaging (WebSocket) |
| **File Service** | 8084 | File upload/download, media storage |
| **Notification Service** | 8082 | Email/push notifications (Brevo API) |
| **Recommendation Service** | 8088 | ML-based book recommendations (Python/FastAPI) |
| **API Gateway** | 8888 | Routes all requests to services |

---

## 🔄 Docker Compose Services

### Available Commands

```bash
# Start everything
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs of specific service
docker-compose logs -f identity-service

# Rebuild after code changes
docker-compose build --no-cache identity-service
docker-compose up -d identity-service

# Execute command in container
docker exec identity-service bash -c "pwd"

# Enter container shell
docker exec -it identity-service bash

# Check container status
docker-compose ps

# Remove everything (including data)
docker-compose down -v
```

---

## 🛠️ Development Setup (Local)

### Requirements
- Java 21 (Spring Boot services)
- Python 3.10+ (Recommendation service)
- Node.js 18+ (Web/Mobile apps)
- MySQL 8.0+
- MongoDB 6.0+
- Neo4j 5.0+
- Kafka 3.7+
- Redis 7.0+

### Run Services Locally (Without Docker)

Each service can be run independently on `localhost`:

```bash
# Identity Service
cd identity-service
mvn spring-boot:run

# Profile Service
cd profile-service
mvn spring-boot:run

# Recommendation Service (Python)
cd recommendation-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────┐
│          FRONTEND LAYER                         │
├─────────────────────────────────────────────────┤
│  Web App (React)    │    Mobile App (React Native)
└──────────┬──────────────────────────┬───────────┘
           │                          │
           └──────────────┬───────────┘
                          │
            ┌─────────────────────────┐
            │   API GATEWAY (8888)    │
            │   (Spring Cloud Gateway) │
            └──────────────┬──────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌─────────────┐  ┌──────────────┐      ┌──────────────┐
│ Identity    │  │ Profile      │      │ Book         │
│ Service     │  │ Service      │      │ Service      │
│ (MySQL)     │  │ (Neo4j)      │      │ (MongoDB)    │
└─────────────┘  └──────────────┘      └──────────────┘
    │                │                     │
    ├────────────────┴─────────────────────┤
    │                 │                    │
    ▼                 ▼                    ▼
┌────────────────────────────────────────────────┐
│          MESSAGE BROKER (Kafka)                │
│   • user-behavior-events                       │
│   • book-events                                │
│   • notification-events                        │
└────────────────────────────────────────────────┘
    │
    └──────┬──────┬──────┬──────────┐
           │      │      │          │
           ▼      ▼      ▼          ▼
        ┌──────┐┌──────┐┌────┐  ┌─────────┐
        │Redis ││Post  ││Chat│  │Notification
        │Cache ││Srv   ││Srv │  │Service  │
        └──────┘└──────┘└────┘  └─────────┘
           │
           ▼
    ┌──────────────┐
    │ Recommendation│
    │ Service (ML) │
    │ (Python/FastAPI)
    └──────────────┘
```

---

## 📝 Configuration

### Environment Variables

All services support environment variable overrides:

```bash
# Identity Service
SPRING_DATASOURCE_URL=jdbc:mysql://host:3306/db
SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# File Service
APP_FILE_STORAGE_DIR=/app/uploads
APP_FILE_DOWNLOAD_PREFIX=http://localhost:8888/file/

# Book Service
APP_BASE_URL=http://localhost:8085
```

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for complete configuration reference.

---

## 🐛 Troubleshooting

### Common Issues

**"Cannot connect to host.docker.internal"**
- Ensure host databases (MySQL, MongoDB, Neo4j) are actually running
- Check Docker Desktop is running properly

**"Kafka: Connection refused"**
- Wait for Kafka to fully initialize (check logs)
- Verify docker-compose.yml has correct bootstrap servers

**"MongoDB authentication failed"**
- Test connection: `mongo --authenticationDatabase admin -u root -p root localhost:27017`
- Ensure user `root` with password `root` exists

**"Port already in use"**
- Kill the process using the port or stop other Docker containers

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed troubleshooting.

---

## 🚀 Building for Production

```bash
# Build optimized images
docker-compose build --progress=plain

# Push to registry
docker tag book-social-network-identity-service:latest myregistry/identity-service:latest
docker push myregistry/identity-service:latest

# Deploy to Kubernetes (optional)
kubectl apply -f k8s/
```

---

## 📱 Run Web Application

```bash
cd web-app
npm install
npm run dev
# Open http://localhost:5173
```

---

## 📱 Run Mobile Application

```bash
cd mobile-app
npm install
npx react-native run-android
# or
npx react-native run-ios
```

---

## 📚 API Documentation

Once services are running:

- **Identity Service**: http://localhost:8080/swagger-ui.html
- **Book Service**: http://localhost:8085/swagger-ui.html
- **Api Gateway**: Available at all service endpoints via http://localhost:8888/

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally: `docker-compose up --build`
4. Submit pull request

---

## 📄 License

[Add your license here]

---

**For detailed setup instructions, see [DOCKER_SETUP.md](DOCKER_SETUP.md)**

