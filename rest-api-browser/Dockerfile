FROM node:16-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies
RUN npm install --production --ignore-scripts

# Then copy everything else
COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"] 