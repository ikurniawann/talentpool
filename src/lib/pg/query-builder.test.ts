import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { QueryBuilder } from "@/lib/pg/query-builder";

config({ path: ".env" });
config({ path: ".env.local" });

describe("QueryBuilder embed FK hints", () => {
  it("parses PostgREST table!fk_hint syntax for self-referential joins", async () => {
    const result = await new QueryBuilder("employees")
      .select(
        `*, manager:employees!reporting_to (id, full_name, nip)`
      )
      .order("full_name", { ascending: true })
      .limit(1);

    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
  });
});
