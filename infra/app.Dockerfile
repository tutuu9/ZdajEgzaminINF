FROM docker:29-cli AS docker-cli
FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/content/package.json packages/content/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/checker/package.json packages/checker/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run db:generate && npm run build
EXPOSE 3001
