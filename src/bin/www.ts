import http from "http";
import app from "../server";
import { prisma } from "../db";
import { logger, config } from "../config";

const server = http.createServer(app);

const startApp = async () => {
  try {
    await prisma.$connect();
    logger.info(`\x1b[32mDB:\x1b[0m SQL Connected`);

    server.listen(config.PORT || "0.0.0.0", () => {
      logger.info(
        `\x1b[36mServer:\x1b[0m Running on http://localhost:${config.PORT}`,
      );
    });
  } catch (error: any) {
    logger.error(
      `\x1b[31mError:\x1b[0m Failed to start server: ${error.message}`,
    );
    if (config.env !== "production") {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  logger.info(`\x1b[33mServer:\x1b[0m Shutting down...`);
  try {
    await prisma.$disconnect();
    logger.info(`\x1b[32mDB:\x1b[0m Disconnected`);

    server.close(() => {
      logger.info(`\x1b[33mServer:\x1b[0m Closed remaining connections`);
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn(`\x1b[31mServer:\x1b[0m Force exiting after timeout`);
      process.exit(1);
    }, 5000);
  } catch (error: any) {
    logger.error(`\x1b[31mShutdown Error:\x1b[0m ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

process.on("unhandledRejection", (reason: unknown) => {
  if (reason instanceof Error) {
    logger.error("\x1b[31mUnhandled Rejection:\x1b[0m", reason.message);
    if (config.env !== "production") {
      console.error(reason.stack);
    }
  } else {
    logger.error("\x1b[31mUnhandled Rejection:\x1b[0m", reason);
  }

  if (config.env === "production") {
    process.exit(1);
  }
});

process.on("uncaughtException", (error: Error) => {
  logger.error("\x1b[31mUncaught Exception:\x1b[0m", error.message);
  if (config.env !== "production") {
    console.error(error.stack);
  }
  if (config.env === "production") {
    process.exit(1);
  }
});

startApp();
