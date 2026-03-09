# ── Stage: production image ──────────────────────────────────
FROM node:22-alpine

LABEL org.opencontainers.image.title="MarkView" \
      org.opencontainers.image.description="Local markdown documentation viewer"

WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY server.js ./
COPY public/ ./public/

# Data directory for workspace persistence (mount a volume here)
RUN mkdir -p /app/data

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Non-root user for safety
RUN addgroup -S markview && adduser -S -G markview markview \
 && chown -R markview:markview /app
USER markview

CMD ["node", "server.js"]
