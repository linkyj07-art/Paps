# Papa's Toys backend + dashboard — container image for Railway (or any host).
FROM node:20-bookworm-slim

# better-sqlite3 is a native module and needs a toolchain to build at install time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json ./
RUN npm install --omit=dev

# App source
COPY src ./src
COPY public ./public

# Railway sets PORT; default to 8080 locally. Data lives on a mounted volume.
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/papas-toys.db

EXPOSE 8080
CMD ["node", "src/index.js"]
