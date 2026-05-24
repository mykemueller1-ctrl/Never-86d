import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerScheduledRoutes } from "./scheduledRoutes";
import { getStaffByPinInternal } from "../db";
import { signStaffSession, STAFF_COOKIE } from "./context";
import { getSessionCookieOptions } from "./cookies";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerScheduledRoutes(app);

  // ─── Owner Quick Login (no PIN screen) ────────────────────────────────────
  app.get("/owner-login", async (req: any, res: any) => {
    try {
      const found = await getStaffByPinInternal("8686");
      if (!found) { res.status(404).send("Owner not found"); return; }
      const token = await signStaffSession(found.id);
      const opts = getSessionCookieOptions(req);
      res.cookie(STAFF_COOKIE, token, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 });
      const { pin, phone, email, passwordHash, facebookAccessToken, ...safe } = found as any;
      const safeJson = JSON.stringify(JSON.stringify(safe));
      res.send(`<!DOCTYPE html><html><head><script>localStorage.setItem('ctap_staff_session',${safeJson});window.location.href='/';<\/script></head><body>Logging you in...</body></html>`);
    } catch (err) {
      res.status(500).send("Login failed: " + String(err));
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
