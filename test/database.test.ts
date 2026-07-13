import { describe, expect, it, vi } from "vitest";
import { insertAndTrim } from "../src/database";
import type { MessageRecord } from "../src/types";

describe("insertAndTrim", () => {
  it("batches the insert before one global 50-row trim", async () => {
    const statements: FakeStatement[] = [];
    const batch = vi.fn(async (_statements: D1PreparedStatement[]) => []);
    const db = {
      prepare(sql: string) {
        const statement = new FakeStatement(sql);
        statements.push(statement);
        return statement;
      },
      batch,
    } as unknown as D1Database;

    const message: MessageRecord = {
      id: "id-1",
      message_id: "message-1",
      sender: "sender@example.net",
      recipient: "box@example.com",
      subject: "hello",
      text_content: "plain",
      html_content: "<p>plain</p>",
      raw_size: 100,
      received_at: "2026-07-12T12:00:00.000Z",
    };

    await insertAndTrim(db, message);
    expect(batch).toHaveBeenCalledOnce();
    expect(batch.mock.calls[0]?.[0]).toEqual(statements);
    expect(statements[0]?.values).toEqual(Object.values(message));
    expect(statements[1]?.sql).toContain("ORDER BY received_at DESC, id DESC");
    expect(statements[1]?.values).toEqual([50]);
    expect(statements[1]?.sql).not.toContain("recipient =");
  });
});

class FakeStatement {
  values: unknown[] = [];
  constructor(public sql: string) {}
  bind(...values: unknown[]): this {
    this.values = values;
    return this;
  }
}
