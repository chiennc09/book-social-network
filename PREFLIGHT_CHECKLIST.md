# ✅ Pre-Flight Checklist

Use this checklist to ensure everything is properly configured before running Docker.

## 1. System Requirements

- [ ] Docker Desktop installed (version 4.0+)
  ```bash
  docker --version
  # Expected: Docker version 24.0+
  ```

- [ ] Docker Compose available
  ```bash
  docker-compose --version
  # Expected: Docker Compose version 2.0+
  ```

- [ ] At least 8GB RAM available for Docker
  - Windows: Docker Desktop Settings → Resources → Memory (set to at least 8GB)
  - Mac/Linux: Check system resources

- [ ] At least 20GB free disk space

---

## 2. Host Machine Databases

### MySQL
- [ ] MySQL running on `localhost:3306`
  ```bash
  mysql -h localhost -u root -p -e "SELECT VERSION();"
  # Should display MySQL version
  ```

- [ ] User `root` with password `root` exists
  ```bash
  mysql -h localhost -u root -p root -e "SELECT 1;"
  # Should return: 1
  ```

- [ ] Required databases created (or will auto-create)
  ```bash
  mysql -h localhost -u root -p root -e "SHOW DATABASES LIKE '%service%';"
  ```

### MongoDB
- [ ] MongoDB running on `localhost:27017`
  ```bash
  mongo --eval "db.version()"
  # Should display MongoDB version
  ```

- [ ] User `root` with password `root` exists
  ```bash
  mongo admin -u root -p root --authenticationDatabase admin --eval "db.version()"
  ```

- [ ] Collections can be created (or will auto-create)

### Neo4j
- [ ] Neo4j running on `localhost:7687`
  ```bash
  # Test connection using cypher-shell or browser
  # Browser: http://localhost:7474
  ```

- [ ] User `neo4j` with password `12345678` exists

- [ ] Default database is accessible

---

## 3. Project Structure

- [ ] Project located at `e:\Project\book-social-network`
  ```bash
  cd e:\Project\book-social-network
  ls  # Should show docker-compose.yml, README.md, etc.
  ```

- [ ] All service folders exist
  ```bash
  ls -d *-service  # Should show 8 services
  ```

- [ ] docker-compose.yml exists and is valid
  ```bash
  docker-compose config > /dev/null && echo "Valid"
  ```

- [ ] All pom.xml files exist for Spring Boot services
  ```bash
  find . -name "pom.xml" -type f | wc -l
  # Should show 8 Maven projects
  ```

---

## 4. Upload Directory

- [ ] Upload directory structure exists or can be created
  ```bash
  mkdir -p upload/covers upload/epubs upload/pdfs upload/avatars
  ls -la upload/
  # Should show subdirectories
  ```

- [ ] Upload directory is writable
  ```bash
  touch upload/test.txt && rm upload/test.txt
  # Should succeed without errors
  ```

---

## 5. Docker Configuration

- [ ] Docker daemon is running
  ```bash
  docker ps
  # Should list containers (even if empty)
  ```

- [ ] No conflicting containers
  ```bash
  docker ps -a | grep -E "kafka|redis|qdrant|identity|profile|post|book|chat|file|notification|recommendation|api-gateway"
  # Should be empty (remove old containers if found)
  ```

- [ ] Ports 8080-8888, 9094, 6379, 6333 are available
  ```bash
  # Windows:
  netstat -ano | findstr "8080 8082 8083 8084 8085 8086 8088 8888 9094 6379 6333"
  
  # Mac/Linux:
  lsof -i :8080,8082,8083,8084,8085,8086,8088,8888,9094,6379,6333
  # Should show no results or Docker-related processes only
  ```

- [ ] Docker network doesn't conflict
  ```bash
  docker network ls | grep book-social-network
  # If exists and issues occur, remove: docker network rm book-social-network_default
  ```

---

## 6. Application Configuration

- [ ] All application.yaml files have environment variable support
  ```bash
  # Check identity-service example
  grep "SPRING_KAFKA_BOOTSTRAP_SERVERS" identity-service/src/main/resources/application.yaml
  # Should show: ${SPRING_KAFKA_BOOTSTRAP_SERVERS:...}
  ```

- [ ] docker-compose.yml has correct environment variables
  ```bash
  grep "SPRING_KAFKA_BOOTSTRAP_SERVERS" docker-compose.yml
  # Should show: - SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092
  ```

---

## 7. Network Configuration

- [ ] `host.docker.internal` resolves (for Docker Desktop)
  ```bash
  # Inside container test:
  docker run --rm alpine ping -c 1 host.docker.internal
  # Should work on Docker Desktop
  ```

- [ ] Docker-compose extra_hosts configured (for Mac/Linux)
  ```bash
  grep -A 1 "extra_hosts:" docker-compose.yml | head -3
  # Should show: - "host.docker.internal:host-gateway"
  ```

---

## 8. Documentation

- [ ] README.md updated with Docker instructions
  ```bash
  grep "docker-compose" README.md
  # Should show Docker commands
  ```

- [ ] DOCKER_SETUP.md exists
  ```bash
  ls -la DOCKER_SETUP.md
  # File should exist and be readable
  ```

- [ ] DOCKER_QUICKSTART.md exists
  ```bash
  ls -la DOCKER_QUICKSTART.md
  # File should exist and be readable
  ```

---

## 9. Git Status (Optional)

- [ ] Work directory is clean (or changes committed)
  ```bash
  git status
  # Should show: "On branch main, nothing to commit" (if using git)
  ```

- [ ] Recent changes are documented
  ```bash
  ls -la CHANGES_SUMMARY.md
  # File should exist with configuration changes
  ```

---

## 10. Final System Check

Run this comprehensive test:

```bash
#!/bin/bash

echo "🔍 Pre-Flight Check"
echo "===================="

# Check Docker
echo "✓ Docker daemon"
docker ps > /dev/null || echo "✗ Docker not running"

# Check databases
echo "✓ MySQL connection"
mysql -h localhost -u root -p root -e "SELECT 1;" > /dev/null || echo "✗ MySQL not accessible"

echo "✓ MongoDB connection"
mongo --authenticationDatabase admin -u root -p root --eval "db.version();" > /dev/null 2>&1 || echo "✗ MongoDB not accessible"

echo "✓ Neo4j connection (manual check recommended)"

# Check ports
echo "✓ Port availability"
for port in 8080 8082 8083 8084 8085 8086 8088 8888 9094 6379 6333; do
  ! (echo >/dev/tcp/localhost/$port) 2>/dev/null || echo "✗ Port $port already in use"
done

# Check project
echo "✓ Project structure"
test -f docker-compose.yml || echo "✗ docker-compose.yml not found"
test -d upload || mkdir -p upload/{covers,epubs,pdfs,avatars}

echo "===================="
echo "Pre-flight check complete!"
echo "Ready to run: docker-compose up -d"
```

Save as `preflight-check.sh` and run:
```bash
chmod +x preflight-check.sh
./preflight-check.sh
```

---

## ⚠️ Common Issues Before Starting

| Issue | Check | Solution |
|-------|-------|----------|
| Port already in use | `netstat -ano \| findstr :8080` | Stop other services or change port |
| Cannot connect to MySQL | `mysql -h localhost -u root -p root` | Start MySQL service |
| Docker daemon not running | `docker ps` | Start Docker Desktop |
| host.docker.internal not available | `docker run alpine ping host.docker.internal` | Update to Docker Desktop 4.0+ |
| Upload directory permission denied | `touch upload/test.txt` | Run as admin or change permissions |
| Image build fails | `docker-compose build --progress=plain` | Check internet connection |

---

## ✅ Ready to Go!

If all checks pass, you're ready to:

```bash
# 1. Build images
docker-compose build --progress=plain

# 2. Start services
docker-compose up -d

# 3. Verify
docker-compose ps
curl http://localhost:8888/identity/health

# 4. Check logs
docker-compose logs kafka
```

**See DOCKER_QUICKSTART.md for next steps!**

---

**Last Updated:** April 8, 2026
**Status:** Ready for Docker Deployment ✅
