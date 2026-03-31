FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy all source files
COPY . .

# Install backend dependencies
RUN cd backend && npm install --production

# Install frontend dependencies and build
RUN cd frontend && npm install && npm run build && cp -r dist /app/dist

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
