FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (npm install includes devDependencies by default)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port 10000 (Zeabur default)
EXPOSE 10000

# Start server
CMD ["npm", "start"]

