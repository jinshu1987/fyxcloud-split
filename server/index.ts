import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import compression from "compression";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { Pool } from "pg";
import { setupWebSocketServer } from "./ws";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

setupWebSocketServer(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: SESSION_SECRET environment variable is required in production.");
    process.exit(1);
  }
  console.warn("WARNING: SESSION_SECRET is not set. Using a random secret — sessions will not persist across restarts.");
}

const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (req.requestId) {
        logLine += ` [${req.requestId.slice(0, 8)}]`;
      }
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else if (process.env.API_ONLY === "true") {
    const allowedOrigins = [
      "http://localhost:5000",
      "http://localhost:5173",
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "",
    ].filter(Boolean);
    app.use((req, res, next) => {
      const origin = req.headers.origin as string;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id");
      }
      if (req.method === "OPTIONS") return res.status(204).end();
      next();
    });
    log("Running in API-only mode (no Vite middleware). Frontend runs separately.");
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const { startAutoDiscoveryScheduler } = await import("./auto-discovery");
  startAutoDiscoveryScheduler();

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  const shutdown = (signal: string) => {
    log(`${signal} received — shutting down gracefully`);
    httpServer.close(() => {
      sessionPool.end().then(() => {
        process.exit(0);
      });
    });
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
