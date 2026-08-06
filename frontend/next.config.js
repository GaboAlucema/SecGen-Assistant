/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: `http://localhost:${process.env.BACKEND_PORT || 8000}`,
  },
};

module.exports = nextConfig;
