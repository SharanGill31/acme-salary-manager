import "dotenv/config";
import { createApp } from "./app";
import { db } from "./db/client";
import { parseAllowedOrigins } from "./middleware/cors";

const port = process.env.PORT ?? "4000";
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

createApp(db, { allowedOrigins }).listen(port, () => {
  console.log(`API listening on port ${port}`);
});
