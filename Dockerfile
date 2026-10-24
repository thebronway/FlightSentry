FROM node:20-alpine

# Install dependencies required for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Copy package definitions
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the Next.js port
EXPOSE 4000