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

-- 同一 Message-ID 可投给不同收件人；仅对「同 message_id + 同 recipient」去重，便于重投幂等
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_message_id_recipient
  ON messages(message_id, recipient);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_received
  ON messages(recipient, received_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_received
  ON messages(received_at DESC, id DESC);
