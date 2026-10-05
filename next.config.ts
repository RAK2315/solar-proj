import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // HiGHS ships Emscripten glue that names Node built-ins (`node:module`,
      // `node:fs`, ...) inside branches it only takes under Node. Webpack still
      // has to resolve them for the browser bundle and fails on the `node:`
      // scheme, so strip the scheme and resolve the bare names to nothing.
      // Found in P0, 5 Oct 2026; see plan/rework/02-stack.md DR-1.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, crypto: false, module: false, url: false,
      };
    }
    return config;
  },
};

export default nextConfig;
