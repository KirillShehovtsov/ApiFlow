FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl netcat-openbsd

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY app.js server.js ./
COPY src ./src

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
CMD ["node", "server.js"]
