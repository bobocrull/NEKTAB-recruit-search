import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "api-server-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith("/api/search-candidates")) {
            try {
              const chunks: any[] = [];
              req.on("data", (chunk: any) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const bodyStr = Buffer.concat(chunks).toString("utf-8");
                  (req as any).body = bodyStr ? JSON.parse(bodyStr) : {};
                } catch {
                  (req as any).body = {};
                }
                const handlerMod = await import("./api/search-candidates.js");
                const handler = handlerMod.default;

                (res as any).status = function (code: number) {
                  res.statusCode = code;
                  return res;
                };
                (res as any).json = function (data: any) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                  return res;
                };

                await handler(req, res);
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            next();
          }
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
