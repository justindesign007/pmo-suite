FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PMO_DB_PATH=/app/data/pmo-suite.sqlite

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "run", "start"]
