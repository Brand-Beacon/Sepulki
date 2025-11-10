# Multi-stage Dockerfile for Hammer Orchestrator
FROM node:25-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types/
COPY services/hammer-orchestrator/package*.json ./services/hammer-orchestrator/
RUN npm ci --workspace=@sepulki/hammer-orchestrator --include-workspace-root
COPY services/hammer-orchestrator ./services/hammer-orchestrator/
WORKDIR /app/services/hammer-orchestrator
RUN npm run build

FROM node:25-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types/
COPY services/hammer-orchestrator/package*.json ./services/hammer-orchestrator/
RUN npm ci --workspace=@sepulki/hammer-orchestrator --include-workspace-root --omit=dev
COPY --from=builder /app/services/hammer-orchestrator/dist ./services/hammer-orchestrator/dist
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs
WORKDIR /app/services/hammer-orchestrator
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
