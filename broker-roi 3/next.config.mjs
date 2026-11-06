/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // Ship the PDF fonts with the serverless functions that render reports
    outputFileTracingIncludes: {
      "/api/report/[id]": ["./assets/fonts/**"],
      "/r/[token]": ["./assets/fonts/**"],
    },
  },
};
export default nextConfig;
