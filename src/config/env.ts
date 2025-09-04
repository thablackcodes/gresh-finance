import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });




const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  env: z.enum(["production", "development", "test"]),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_DAYS:z.coerce.number(),
  REFRESH_TOKEN_EXPIRES_DAYS:z.coerce.number(),
});

const config = configSchema.parse(process.env);
export { config };
