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

# Copy static files
RUN cp -r public .next/standalone/public
RUN cp -r .next/static .next/standalone/.next/static

# Expose the Next.js port
EXPOSE 4000