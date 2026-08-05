import type { NextConfig } from "next";

// Painel administrativo não carrega scripts/estilos/fontes externos — tudo
// é servido pelo próprio Next.js (inclusive fotos de quartos/galeria via
// /api/uploads, mesma origem). CSP pode ficar restrita a 'self'.
// Em dev, o webpack do Next usa eval() para hot-reload e um WebSocket local
// para o HMR — sem liberar isso aqui a CSP quebraria a própria tela de
// desenvolvimento. Nunca vai para produção (isProd é fixo por build).
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  `connect-src 'self'${isProd ? "" : " ws://localhost:* ws://127.0.0.1:*"}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
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
