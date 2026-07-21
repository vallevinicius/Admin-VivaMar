import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // CORS liberado apenas para as rotas públicas (consumidas pela
        // landing page externa). As rotas /api/tenant/* e /api/auth/* são
        // protegidas por cookie de sessão e não devem aceitar origens
        // arbitrárias.
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date",
          },
        ],
      },
    ];
  },
  typedRoutes: true,
  serverExternalPackages: ["sequelize", "sequelize-typescript"],
};

export default nextConfig;
