FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/apps/services/auth
CMD ["npm", "run", "start"]
