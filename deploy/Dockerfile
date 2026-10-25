FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY config ./config
RUN mkdir data && chown node:node data

USER node
EXPOSE 3978
CMD ["node", "--no-warnings=ExperimentalWarning", "src/main.ts"]
