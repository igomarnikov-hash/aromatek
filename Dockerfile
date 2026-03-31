FROM node:20-alpine

RUN apk add --no-cache curl python3 make g++

WORKDIR /app

# Copy all source files
COPY . .

# Install backend dependencies (fresh, no lock file)
RUN cd backend && rm -f package-lock.json && npm install --production

# Build frontend (fresh install for correct platform)
RUN cd frontend && rm -f package-lock.json && npm install && npm run build && cp -r dist /app/dist

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
