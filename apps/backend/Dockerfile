FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY apps/backend/package*.json ./apps/backend/

# Install build dependencies
RUN npm install

# Copy source code
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Build shared packages and backend
RUN npm --workspace=@orbit/shared run build && \
    npm --workspace=@orbit/database run build && \
    npm --workspace=@orbit/backend run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/migrations ./packages/database/migrations
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

EXPOSE 4000

CMD ["node", "apps/backend/dist/index.js"]
