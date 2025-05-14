# Stage 1: Build stage (if you need to compile or transpile, e.g., TypeScript)
# For a simple Node.js app, this might just be for installing dependencies including dev ones for tests
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Install all dependencies, including dev, if tests are run here or artifacts are needed
RUN npm install
COPY . .
# Optional: Run tests here if you want them as part of Docker build validation
# RUN npm test

# Stage 2: Production stage
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production
# Copy application code from builder stage (or directly if no complex build step)
COPY --from=builder /usr/src/app .
# Or if no builder stage:
# COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables if not passed at runtime
ENV NODE_ENV=production
ENV PORT=3000
# MONGO_URI and JWT_SECRET should be passed at runtime for security and flexibility

# Define the command to run the app
CMD ["node", "server.js"]