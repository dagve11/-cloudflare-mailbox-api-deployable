/** 中国无夏令时，固定 UTC+8 */
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 将 Date 格式化为东八区 ISO：`YYYY-MM-DDTHH:mm:ss.sss+08:00` */
export function toChinaISOString(date: Date = new Date()): string {
  const local = new Date(date.getTime() + CHINA_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = pad(local.getUTCMonth() + 1);
  const d = pad(local.getUTCDate());
  const h = pad(local.getUTCHours());
  const min = pad(local.getUTCMinutes());
  const s = pad(local.getUTCSeconds());
  const ms = String(local.getUTCMilliseconds()).padStart(3, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}+08:00`;
}

/**
 * 解析任意可被 Date.parse 识别的时间，规范为东八区毫秒三位格式。
 * 无法解析时返回 null。
 */
export function normalizeToChinaISO(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return toChinaISOString(new Date(ms));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
