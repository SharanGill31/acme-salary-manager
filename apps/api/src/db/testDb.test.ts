import { describe, expect, it } from "vitest";
import { createTestDb } from "./testDb";
import { departments } from "./schema";

describe("createTestDb", () => {
  it("applies migrations and allows a basic select", async () => {
    const db = await createTestDb();

    const rows = await db.select().from(departments);

    expect(rows).toEqual([]);
  });
});
