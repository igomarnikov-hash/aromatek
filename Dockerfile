FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .

# Backend
RUN cd backend && rm -f package-lock.json && npm install --production --force

# Frontend build
RUN cd frontend && rm -f package-lock.json && npm install --force && npm run build && cp -r dist /app/dist

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
