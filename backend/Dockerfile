FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port 10000 (Zeabur default)
EXPOSE 10000

# Start server (prestart will run automatically, but we already built above)
CMD ["npm", "start"]

