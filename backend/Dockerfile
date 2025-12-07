FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies (needed for TypeScript build)
# Use --include=dev to ensure devDependencies are installed even in production
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port 10000 (Zeabur default)
EXPOSE 10000

# Start server
CMD ["npm", "start"]

