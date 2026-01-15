FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma client (πολύ σημαντικό)
RUN npx prisma generate

EXPOSE 4000

CMD ["npm","run","start:dev"]

