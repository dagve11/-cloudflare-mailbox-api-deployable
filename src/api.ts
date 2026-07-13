import {
  deleteByAddress,
  deleteById,
  getMessage,
  latestMessage,
  listMessages,
} from "./database";
import type { ApiError, ApiSuccess, Env, MessageFilters } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  try {
    if (method === "GET" && url.pathname === "/health") {
      return ok({ status: "ok" });
    }
    if (method === "POST" && url.pathname === "/api/address") {
      return createAddress(request, env);
    }
    if (method === "GET" && url.pathname === "/api/messages/latest") {
      const filters = parseFilters(url);
      const message = await latestMessage(env.DB, filters);
      return ok({ message });
    }
    if (url.pathname === "/api/messages") {
      const address = requireAddress(url.searchParams.get("address"));
      if (method === "GET") {
        const messages = await listMessages(env.DB, parseFilters(url));
        return ok({ messages, count: messages.length });
      }
      if (method === "DELETE") {
        const deleted = await deleteByAddress(env.DB, address);
        return ok({ deleted });
      }
    }

    const match = url.pathname.match(/^\/api\/messages\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]!);
      if (method === "GET") {
        const message = await getMessage(env.DB, id);
        return message ? ok({ message }) : fail(404, "not_found", "Message not found");
      }
      if (method === "DELETE") {
        const deleted = await deleteById(env.DB, id);
        return deleted ? ok({ deleted }) : fail(404, "not_found", "Message not found");
      }
    }

    return fail(404, "not_found", "Route not found");
  } catch (error) {
    if (error instanceof RequestError) {
      return fail(400, "bad_request", error.message);
    }
    console.error("Request failed", error);
    return fail(500, "internal_error", "Internal server error");
  }
}

async function createAddress(request: Request, env: Env): Promise<Response> {
  let requestedPrefix: string | undefined;
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await request.json<{ prefix?: unknown }>();
    if (typeof body.prefix === "string") requestedPrefix = body.prefix;
  }

  const prefix = requestedPrefix?.trim().toLowerCase() || randomPrefix();
  if (!/^[a-z0-9][a-z0-9._-]{0,62}$/.test(prefix)) {
    throw new RequestError("prefix must contain only a-z, 0-9, dot, underscore or hyphen");
  }
  const domain = env.MAIL_DOMAIN.trim().toLowerCase();
  if (!domain) throw new Error("MAIL_DOMAIN is not configured");
  return ok({ address: `${prefix}@${domain}` }, 201);
}

function parseFilters(url: URL): MessageFilters {
  const address = requireAddress(url.searchParams.get("address"));
  const after = optional(url.searchParams.get("after"));
  if (after && Number.isNaN(Date.parse(after))) {
    throw new RequestError("after must be a valid ISO 8601 timestamp");
  }
  return {
    address,
    after,
    sender: optional(url.searchParams.get("sender"))?.toLowerCase(),
    subject: optional(url.searchParams.get("subject")),
  };
}

function requireAddress(value: string | null): string {
  const address = value?.trim().toLowerCase();
  if (!address || !EMAIL_PATTERN.test(address)) throw new RequestError("A valid address is required");
  return address;
}

function optional(value: string | null): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function randomPrefix(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

function ok<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return Response.json(body, { status });
}

function fail(status: number, code: string, message: string): Response {
  const body: ApiError = { success: false, error: { code, message } };
  return Response.json(body, { status });
}

class RequestError extends Error {}
