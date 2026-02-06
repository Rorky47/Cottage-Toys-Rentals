import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals({ nativeFetch: true });

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will eventually
// stop passing in HOST, so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;

let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        // Polaris ships an invalid media query:
        //   @media (--p-breakpoints-md-up) and print { ... }
        // esbuild's CSS minifier warns on it. Rewrite to valid syntax.
        {
          postcssPlugin: "fix-polaris-print-media-query",
          AtRule: {
            media: (atRule: any) => {
              if (typeof atRule?.params !== "string") return;
              if (!atRule.params.includes("(--p-breakpoints-md-up) and print")) return;
              atRule.params = atRule.params.replace(
                "(--p-breakpoints-md-up) and print",
                "print and (--p-breakpoints-md-up)",
              );
            },
          },
        },
      ],
    },
  },
  server: {
    allowedHosts: [host],
    cors: {
      preflightContinue: true,
    },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      appDirectory: "app",
      ignoredRouteFiles: ["**/.*", "**/*.test.*", "**/*.spec.*"],
      routes(defineRoutes) {
        return defineRoutes((route) => {
          route("/", "routes/_index/route.tsx", { index: true });
          route("app", "routes/app/route.tsx", () => {
            route("", "routes/app._index/route.tsx", { index: true });
            route(":page", "routes/app/$page.tsx");
          });
          route("apps/rental/:proxy", "routes/apps.rental.$proxy.tsx");
          route("auth/login", "routes/auth/login/route.tsx");
          route("auth/*", "routes/auth/$.tsx");
          route("webhooks/:topic/:subtopic", "routes/webhooks/$topic/$subtopic.tsx");
        });
      },
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react", "@shopify/polaris"],
  },
}) satisfies UserConfig;
