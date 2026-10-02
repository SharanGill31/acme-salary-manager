import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// The HKT slot is left as `any` on purpose: `NodePgDatabase<schema>` and
// `PgliteDatabase<schema>` are both `PgDatabase<SomeHKT, schema>` for a
// different concrete HKT. A union of the two breaks overload resolution on
// methods like `.returning()`; loosening this one slot keeps both drivers
// assignable to the same single (non-union) type instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;
