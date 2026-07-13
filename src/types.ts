export interface Env {
  DB: D1Database;
  MAIL_DOMAIN: string;
}

export interface MessageRecord {
  id: string;
  message_id: string;
  sender: string;
  recipient: string;
  subject: string;
  text_content: string;
  html_content: string;
  raw_size: number;
  received_at: string;
}

export interface MessageFilters {
  address: string;
  after?: string;
  sender?: string;
  subject?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}
