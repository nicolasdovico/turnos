FROM node:22-alpine

WORKDIR /app

ENV WATCHPACK_POLLING=true
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY package*.json ./

RUN if [ -f package.json ]; then npm install; fi

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
