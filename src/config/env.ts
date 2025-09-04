import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });




const configSchema = z.object({
  PORT: z.coerce.number().default(5001),
  DATABASE_URL: z.string(),
  env: z.enum(["production", "development", "test"]),
  // CACHE_KEY: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  // LENHUB_CLIENT_ID: z.string(),
  // LENHUB_API_KEY: z.string(),
  // LENHUB_SENDER_ID: z.string(),
  // NOMBA_CLIENT_ID: z.string(),
  // NOMBA_PRIVATE_KEY: z.string(),
  // NOMBA_ACCOUNT_ID: z.string(),
  // STRIPE_SECRET_KEY: z.string(),
  // STRIPE_WEBHOOK_SECRET:z.string(),
  // BASE_API_URL:z.string(),
  // NOMBA_API_BASE:z.string(),
  // EXPO_API_KEY:z.string(),
  // LENHUB_API_BASE:z.string(),
  ACCESS_TOKEN_EXPIRES_DAYS:z.coerce.number(),
  REFRESH_TOKEN_EXPIRES_DAYS:z.coerce.number(),
  // ADMIN_ACCESS_TOKEN_EXPIRES_DAYS:z.coerce.number(),
  // ADMIN_REFRESH_TOKEN_EXPIRES_DAYS:z.coerce.number(),
  // QUEUE_URL:z.string(),
  // QUEUE_NAME:z.string(),
  // RETRY_EXCHANGE:z.string(),
  // RETRY_QUEUE:z.string(),
  // RETRY_DELAY_MS:z.coerce.number(),
  // SMS_SENDER_ID:z.string(),
  // SUPER_ADMIN_PASS:z.string(),
  // REDIS_URL:z.string(),
});

const config = configSchema.parse(process.env);
export { config };