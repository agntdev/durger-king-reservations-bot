FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY lib/bot-toolkit/package.json lib/bot-toolkit/package.json
RUN npm ci --omit=dev

COPY dist/ dist/

ENV NODE_ENV=production

CMD ["node", "dist/src/bot.js"]