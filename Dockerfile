FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .

# Backend deps
RUN cd backend && rm -f package-lock.json && npm install --production

# Frontend: clean install (no lock file = fresh platform-correct packages)
RUN cd frontend && rm -f package-lock.json && npm install && npm run build && cp -r dist /app/dist

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
