FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Copy SQL migration files next to the compiled migrate.js
RUN cp -r src/db/migrations dist/db/migrations

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
CMD ["./entrypoint.sh"]
