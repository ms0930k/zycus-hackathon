# Stage 1: Build application with Maven
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /build

# Pre-cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Build production artifact
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal Production JRE Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Non-root user for container security
RUN addgroup -S stockpulse && adduser -S stockpulse -G stockpulse

COPY --from=builder /build/target/stockpulse-backend-0.0.1-SNAPSHOT.jar app.jar

RUN chown -R stockpulse:stockpulse /app
USER stockpulse

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
