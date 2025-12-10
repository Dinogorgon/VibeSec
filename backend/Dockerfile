FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies (needed for TypeScript build)
# Explicitly set NODE_ENV=development during install to ensure devDependencies are installed
# even if platform has NODE_ENV=production set globally
RUN NODE_ENV=development npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port (Render sets PORT dynamically via environment variable)
# Default to 10000 for local development, but Render will override
EXPOSE ${PORT:-10000}

# Start server (PORT will be read from environment variable)
CMD ["npm", "start"]

