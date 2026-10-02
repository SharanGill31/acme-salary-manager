import "dotenv/config";
import { createApp } from "./app";
import { db } from "./db/client";

const port = process.env.PORT ?? "4000";

createApp(db).listen(port, () => {
  console.log(`API listening on port ${port}`);
});
