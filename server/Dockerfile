FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p /app/uploads

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "const http=require('http');http.get('http://localhost:3001/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
