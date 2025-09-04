// ✅ Core & Third-party Modules
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { setupSwagger } from "./swagger";
import compression from "compression";
// import cookieParser from "cookie-parser";
import path from 'path';
import hpp from "hpp";
import cors from "cors";
import enforce from "express-sslify";

// ✅ Config & Middlewares
import { logger,morganMiddleware, config,} from "./config";
import {
  errorHandler,
  sanitize,
  authRateLimiter,
  generalRateLimiter,
  ApiError,
} from "./middlewares";
import { httpStatus } from "./utils";

// ✅ Routes & Controllers
import { customerRouter } from "./routers";



// ✅ App Initialization
const app = express();

// ========================
// 🛡️ SECURITY MIDDLEWARE
// ========================

// 🔒 1. Force HTTPS in production
if (config.env === "production") {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}

// 🔒 2. Security Headers
app.use(
  helmet({
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "trusted.cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "trusted.cdn.com"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    xssFilter: true,
    noSniff: true,
  }),
);
app.disable("x-powered-by");






// 🔒 3. Additional Security Headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// 🔒 4. CORS Configuration
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    const allowedOrigins = [
      "https://navoapi.viaspark.site",
      "http://localhost:4000",
      "https://your-mobile-app.com",
      "capacitor://localhost",
      "ionic://localhost",
      "http://localhost",
    ];

    if (
      !origin ||
      allowedOrigins.some(
        (allowedOrigin) =>
          origin === allowedOrigin ||
          origin.startsWith(`${allowedOrigin}/`) ||
          origin.endsWith(`.${allowedOrigin}`),
      )
    ) {
      return callback(null, true);
    }
    callback(new Error("Not allowed"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "expo-api-key"
  ],
  exposedHeaders: ['set-cookie'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));



// 🔒 6. Body Parsing & Security
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(hpp());
app.use(compression());
app.use(sanitize);
app.set("trust proxy", 1);
// app.use(cookieParser());

// 🔒 7. Content-Type Validation
app.use((req: Request, res: Response, next: NextFunction): void => {
  // if (req.path.startsWith("/webhook/")) return next();

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"];
    if (
      !contentType ||
      (!contentType.includes("application/json") &&
       !contentType.includes("multipart/form-data"))
    ) {
      res.status(400).json({ error: "Content-Type must be application/json or multipart/form-data" });
    }
  }

  next();
});


// ========================
// 🚀 APPLICATION MIDDLEWARE
// ========================
// 



// 📝 1. Logging
app.use(morganMiddleware);
app.use((req: Request, _res: Response, next: NextFunction) => {
  const logPayload = config.env === "development" && ['POST', 'PUT'].includes(req.method);
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    ua: req.headers["user-agent"],
    ...(logPayload && { body: req.body }),
  });
  next();
});



// app.use(
//   "/webhook",nombaHooks
// );

// 📚 3. Swagger Documentation
setupSwagger(app);


// ========================
// 🛣️ ROUTES
// ========================

// 🏠 1. Basic Routes
app.get("/", (_req: Request, res: Response) => {
  res.send("Hello, Welcome to the Gresh-Finance API!");
});

app.get("/ping", (_req, res) => {
  res.status(200).send("🏓 PONG");
});

// Apply auth limiter to login/register endpoints
app.use("/api/v1/auth", authRateLimiter);

// Apply general limiter to the rest of the API
app.use("/api/v1",generalRateLimiter);
// 🚀 2. API Routes
app.use("/api/v1", customerRouter);

// ========================
// 🚨 ERROR HANDLING
// ========================

// ❌ 1. 404 Handler
app.use((req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// 🛑 1. Global Error Handler

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    // handle known errors
    return res.status(err.statusCode).json({
      success: false,
      ...err.toJSON(),
    });
  }
  
  // fallback for unknown errors
  logger.error(err);
  return res.status(500).json({
    success: false,
    message: config.env === 'development' ? err.message : 'Something went wrong',
    ...(config.env === 'development' && { stack: err.stack }),
  });
});




// 🛑 2. Global Error Handler
app.use(errorHandler);



export default app;
