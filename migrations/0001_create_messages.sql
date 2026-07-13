CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  text_content TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  raw_size INTEGER NOT NULL,
  received_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_message_id
  ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_received
  ON messages(recipient, received_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_received
  ON messages(received_at DESC, id DESC);
