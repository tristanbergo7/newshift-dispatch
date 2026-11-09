import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the phone (via the cloudflared/ngrok tunnel) load dev assets.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"],
};

export default nextConfig;
