import type { MessageFilters, MessageRecord } from "./types";

const COLUMNS = `id, message_id, sender, recipient, subject,
  text_content, html_content, raw_size, received_at`;

export async function insertAndTrim(
  db: D1Database,
  message: MessageRecord,
): Promise<void> {
  const insert = db.prepare(`
    INSERT INTO messages (
      id, message_id, sender, recipient, subject,
      text_content, html_content, raw_size, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    message.id,
    message.message_id,
    message.sender,
    message.recipient,
    message.subject,
    message.text_content,
    message.html_content,
    message.raw_size,
    message.received_at,
  );

  const trim = db.prepare(`
    DELETE FROM messages
    WHERE id NOT IN (
      SELECT id FROM messages
      ORDER BY received_at DESC, id DESC
      LIMIT ?
    )
  `).bind(50);

  // D1 executes a batch sequentially inside one transaction. Concurrent email
  // deliveries therefore cannot interleave between this insert and its trim.
  await db.batch([insert, trim]);
}

export async function listMessages(
  db: D1Database,
  filters: MessageFilters,
): Promise<MessageRecord[]> {
  return queryMessages(db, filters, 50);
}

async function queryMessages(
  db: D1Database,
  filters: MessageFilters,
  limit: number,
): Promise<MessageRecord[]> {
  const clauses = ["recipient = ?"];
  const values: unknown[] = [filters.address];

  if (filters.after) {
    clauses.push("received_at > ?");
    values.push(filters.after);
  }
  if (filters.sender) {
    clauses.push("sender = ?");
    values.push(filters.sender);
  }
  if (filters.subject) {
    clauses.push("subject LIKE ? ESCAPE '\\'");
    values.push(`%${escapeLike(filters.subject)}%`);
  }

  const statement = db.prepare(`
    SELECT ${COLUMNS} FROM messages
    WHERE ${clauses.join(" AND ")}
    ORDER BY received_at DESC, id DESC
    LIMIT ?
  `).bind(...values, limit);

  return (await statement.all<MessageRecord>()).results;
}

export async function latestMessage(
  db: D1Database,
  filters: MessageFilters,
): Promise<MessageRecord | null> {
  const messages = await queryMessages(db, filters, 1);
  return messages[0] ?? null;
}

export async function getMessage(
  db: D1Database,
  id: string,
): Promise<MessageRecord | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM messages WHERE id = ? LIMIT ?`)
    .bind(id, 1)
    .first<MessageRecord>();
}

export async function deleteByAddress(db: D1Database, address: string): Promise<number> {
  const result = await db.prepare("DELETE FROM messages WHERE recipient = ?")
    .bind(address)
    .run();
  return result.meta.changes;
}

export async function deleteById(db: D1Database, id: string): Promise<number> {
  const result = await db.prepare("DELETE FROM messages WHERE id = ?")
    .bind(id)
    .run();
  return result.meta.changes;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
