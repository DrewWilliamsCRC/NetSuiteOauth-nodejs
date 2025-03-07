#!/bin/bash

# Stop any running containers from our project
echo "Stopping any existing containers..."
docker-compose down

# Build the development container
echo "Building REST API Browser container with development configuration..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Start the development environment
echo "Starting REST API Browser development environment..."
echo "The application will be available at http://localhost:3000"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Use the following command instead if you want to run in detached mode
# docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d 