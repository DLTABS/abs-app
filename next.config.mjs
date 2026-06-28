/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // reactCompiler: true, // Disabled — causes Turbopack SyntaxError with Next.js 16

  // Đảm bảo file template Word (đọc bằng readFileSync ngoài public/) được đóng gói
  // vào serverless function khi deploy Vercel — file-tracing tự động không nhận diện
  // được path động join(process.cwd(), 'templates', ...).
  outputFileTracingIncludes: {
    '/api/admin/contract': ['./templates/**'],
  },
};

export default nextConfig;
