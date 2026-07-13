-- 已应用旧版 0001（全局 message_id 唯一）的环境：改为 (message_id, recipient) 联合唯一
DROP INDEX IF EXISTS idx_messages_message_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_message_id_recipient
  ON messages(message_id, recipient);
