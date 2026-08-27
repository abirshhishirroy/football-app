FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Install production deps fresh in this runtime image so native modules
# (better-sqlite3) are built/prebuilt for this exact Node + glibc.
RUN npm ci --omit=dev

EXPOSE 3001
CMD ["npm", "start"]
