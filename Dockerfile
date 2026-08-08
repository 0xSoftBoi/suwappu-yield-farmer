FROM node:24-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM oven/bun:1.3.14

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

USER bun
ENTRYPOINT ["bun", "src/cli.ts"]
CMD ["markets", "--json"]
