FROM node:20-alpine

WORKDIR /app

# Copy root package files for workspace install
COPY package*.json ./
COPY services/video-stream-proxy/package*.json ./services/video-stream-proxy/

# Install dependencies using workspace
RUN npm ci --workspace=@sepulki/video-stream-proxy --include-workspace-root

# Copy service files
COPY services/video-stream-proxy/tsconfig.json ./services/video-stream-proxy/
COPY services/video-stream-proxy/src ./services/video-stream-proxy/src

# Build TypeScript
WORKDIR /app/services/video-stream-proxy
RUN npm run build

# Expose proxy port
EXPOSE 8889

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8889/health', (r) => {if (r.statusCode !== 200) throw new Error()})"

# Start proxy
CMD ["npm", "start"]





