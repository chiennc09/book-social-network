# ─── Build stage ───────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache Maven dependencies (only re-downloaded when pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# Build the application (skip tests & code formatter in CI)
COPY src ./src
RUN mvn package -DskipTests -Dspotless.skip=true -B -q

# ─── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Security: run as non-root user
RUN groupadd -r spring && useradd -r -g spring spring
USER spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "-Djava.security.egd=file:/dev/./urandom", "app.jar"]
