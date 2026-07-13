import PostalMime from "postal-mime";
import { insertAndTrim } from "./database";
import type { Env, MessageRecord } from "./types";

export async function receiveEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
  const raw = await new Response(message.raw).arrayBuffer();
  const parsed = await PostalMime.parse(raw);
  const now = new Date().toISOString();

  const record: MessageRecord = {
    id: crypto.randomUUID(),
    message_id: normalizeMessageId(message.headers.get("Message-ID")) ?? crypto.randomUUID(),
    sender: message.from.toLowerCase(),
    recipient: message.to.toLowerCase(),
    subject: parsed.subject ?? "",
    text_content: parsed.text ?? "",
    html_content: typeof parsed.html === "string" ? parsed.html : "",
    raw_size: raw.byteLength,
    received_at: now,
  };

  await insertAndTrim(env.DB, record);
}

function normalizeMessageId(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
