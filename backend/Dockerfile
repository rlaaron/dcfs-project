# Use Node.js Alpine with build tools
FROM node:20-alpine

# Install g++ and make for compiling the C++ core
RUN apk add --no-cache g++ make cmake libstdc++

# Set working directory to root to have access to both core and backend
WORKDIR /app

# Copy package files first for caching
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Go back to app root and copy all source code
WORKDIR /app
COPY . .

# Compile the C++ Core Engine
WORKDIR /app/core
RUN g++ -std=c++17 -Iinclude src/ThreadManager.cpp src/MetadataMonitor.cpp src/ChunkManager.cpp src/main.cpp -o dcfs_core -pthread

# Build NestJS Backend
WORKDIR /app/backend
RUN npm run build

# Expose the default NestJS port
EXPOSE 3000

# Start the NestJS application
CMD ["npm", "run", "start:prod"]
