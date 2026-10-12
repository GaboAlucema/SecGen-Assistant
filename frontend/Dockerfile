FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

# NEXT_PUBLIC_* se incrusta en el bundle durante el build. Si queda vacío, el navegador
# resuelve la API como <host actual>:<BACKEND_PORT> (ver src/app/page.js).
ARG NEXT_PUBLIC_API_URL=""
ARG BACKEND_PORT=8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_PORT=${BACKEND_PORT}

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
