FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "src/index.js"]
