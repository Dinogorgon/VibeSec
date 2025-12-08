FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies (needed for TypeScript build)
# Explicitly set NODE_ENV=development during install to ensure devDependencies are installed
# even if Zeabur has NODE_ENV=production set globally
RUN NODE_ENV=development npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port 10000 (Zeabur default)
EXPOSE 10000

# Start server
CMD ["npm", "start"]

