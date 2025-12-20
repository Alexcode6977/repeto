import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use serverExternalPackages for libraries with binary/wasm dependencies
  serverExternalPackages: ["mupdf"],

  // Empty turbopack config to silence the webpack conflict error in Next 16
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Keep WASM support for webpack (used in build/non-turbopack modes)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    if (isServer) {
      config.externals.push({
        mupdf: "commonjs mupdf",
      });
    }

    return config;
  },
};

export default nextConfig;
