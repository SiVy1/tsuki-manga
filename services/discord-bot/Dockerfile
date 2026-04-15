FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY index.mjs ./index.mjs

EXPOSE 3001

CMD ["node", "index.mjs"]
