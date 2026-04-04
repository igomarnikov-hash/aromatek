FROM node:20-slim

RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Backend deps
RUN cd backend && rm -f package-lock.json && npm install --production

# Frontend: fresh install on glibc x64, then build
RUN cd frontend && rm -f package-lock.json && npm install && npm run build && rm -rf /app/dist && mv dist /app/dist

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
