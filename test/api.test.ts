import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/api";
import type { Env } from "../src/types";

describe("HTTP API", () => {
  it("returns health status", async () => {
    const response = await handleRequest(new Request("https://worker.test/health"), env());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { status: "ok" } });
  });

  it("serves nginx welcome page on root", async () => {
    const response = await handleRequest(new Request("https://mailbox-api.natv.cc.cd/"), env());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("server")).toBe("nginx");
    const html = await response.text();
    expect(html).toContain("Welcome to nginx!");
    expect(html).toContain("Thank you for using nginx.");
  });

  it("serves nginx 404 for unknown non-api paths", async () => {
    const response = await handleRequest(new Request("https://mailbox-api.natv.cc.cd/robots.txt"), env());
    expect(response.status).toBe(404);
    expect(response.headers.get("server")).toBe("nginx");
    expect(await response.text()).toContain("404 Not Found");
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

  it("rejects invalid JSON body on address create with 400", async () => {
    const response = await handleRequest(new Request("https://worker.test/api/address", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }), env());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "bad_request", message: "request body must be valid JSON" },
    });
  });

  it("rejects invalid after timestamps with 400", async () => {
    const response = await handleRequest(
      new Request("https://worker.test/api/messages/latest?address=a@example.com&after=not-a-date"),
      env(),
    );
    expect(response.status).toBe(400);
    const body = await response.json() as { error: { message: string } };
    expect(body.error.message).toContain("after");
  });
});

function env(): Env {
  return { DB: {} as D1Database, MAIL_DOMAIN: "example.com" };
}
