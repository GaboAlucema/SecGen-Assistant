/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_API_URL y NEXT_PUBLIC_BACKEND_PORT llegan como build args (ver Dockerfile / docker-compose.yml).
// Next los incrusta automáticamente en el bundle; ya no se fuerza localhost aquí.
const nextConfig = {};

module.exports = nextConfig;
