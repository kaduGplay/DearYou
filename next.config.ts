import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./src/site-html/**/*.html"] },
};

export default nextConfig;
