import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/api";
import type { Env } from "../src/types";

describe("HTTP API", () => {
  it("returns health status", async () => {
    const response = await handleRequest(new Request("https://worker.test/health"), env());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { status: "ok" } });
  });

  it("creates a requested catch-all address", async () => {
    const response = await handleRequest(new Request("https://worker.test/api/address", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefix: "order-1111" }),
    }), env());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: { address: "order-1111@example.com" },
    });
  });

  it("rejects message queries without an address", async () => {
    const response = await handleRequest(new Request("https://worker.test/api/messages/latest"), env());
    expect(response.status).toBe(400);
  });
});

function env(): Env {
  return { DB: {} as D1Database, MAIL_DOMAIN: "example.com" };
}
