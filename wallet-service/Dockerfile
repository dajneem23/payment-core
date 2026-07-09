# ---- build stage: compile and package with Maven ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Cache dependencies first: copy only the POM, then go offline.
COPY pom.xml .
RUN mvn -q -e -B dependency:go-offline

# Now copy sources and build the jar (tests run in CI, skipped in the image build).
COPY src ./src
RUN mvn -q -B clean package -DskipTests

# ---- runtime stage: slim JRE with just the jar ----
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app

# Run as a non-root user.
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /build/target/*.jar app.jar
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
