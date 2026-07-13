import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __ticoDbClient: ReturnType<typeof postgres> | undefined;
  var __ticoDb: Db | undefined;
}

// Connecting is deferred to first use (rather than at module import time) so
// that `next build` can statically analyze route handlers that import this
// module without requiring DATABASE_URL to be set at build time.
function getDb(): Db {
  if (globalThis.__ticoDb) return globalThis.__ticoDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment (see SETUP.md)."
    );
  }

  const client =
    globalThis.__ticoDbClient ?? postgres(connectionString, { max: 1 });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__ticoDbClient = client;
  }

  const instance = drizzle(client, { schema });
  globalThis.__ticoDb = instance;
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
