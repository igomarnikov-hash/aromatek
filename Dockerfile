FROM node:22-slim

RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Backend deps (без better-sqlite3 — используем node:sqlite)
RUN cd backend && rm -f package-lock.json && npm install --production

# Frontend: сборка в /app/dist
RUN cd frontend && rm -f package-lock.json && npm install && npm run build && cp -r dist /app/dist

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
