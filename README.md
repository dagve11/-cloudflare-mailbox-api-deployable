# Cloudflare Catch-all Mailbox API

基于 Cloudflare Workers + Email Routing + D1 的轻量**临时收信 API**。

- Catch-all 收信：任意前缀 `@你的域名` 都能进 Worker
- 只存正文（纯文本 / HTML），**不存附件**
- 全局只保留最新 **50** 封（按接收时间）
- 无定时任务；重投幂等（`message_id + recipient`）

适合：注册验证码、联调收信、脚本轮询取最新一封。

## 架构

```text
发信方 → Email Routing (Catch-all)
              ↓
        Email Worker (postal-mime 解析)
              ↓
             D1 (messages，全局 trim 50)
              ↑
     HTTP API（查列表 / 最新 / 删信）
```

`POST /api/address` **不会**创建真实邮箱账户，只生成/返回一个可用于 Catch-all 的地址字符串。

## 快速部署

**要求：** Cloudflare 账户、域名已接入 Cloudflare、Node.js 20+。

```bash
npm install
npx wrangler login
npx wrangler d1 create mailbox-db
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`：

1. 填入 D1 的 `database_id`
2. 将 `MAIL_DOMAIN` 改为你的收信域名（如 `example.com`）
3. 按需配置 `routes` / 自定义域名

```bash
npm run db:migrate:remote
npm run check
npm run deploy
```

### 配置 Email Routing

Cloudflare 控制台 → **Email** → **Email Routing** → **Routing rules**：

1. 启用 Email Routing，按提示加 DNS
2. 新建 **Catch-all** 规则
3. 动作：**Send to a Worker** → 选择本项目 Worker
4. 启用规则

之后 `任意前缀@MAIL_DOMAIN` 即可收信。

> `wrangler.toml` 含数据库 ID 等环境信息，已在 `.gitignore` 中忽略；仓库只保留 `wrangler.toml.example`。

## 数据说明

| 字段 | 说明 |
|------|------|
| `id` | 本地 UUID 主键 |
| `message_id` | 邮件头 Message-ID（缺省时生成） |
| `sender` / `recipient` | 发件 / 收件，入库小写 |
| `subject` | 标题 |
| `text_content` / `html_content` | 正文 |
| `raw_size` | 原始体积（字节） |
| `received_at` | 收到时间（**东八区**） |

**时间：** 固定格式 `YYYY-MM-DDTHH:mm:ss.sss+08:00`  
示例：`2026-07-13T20:00:00.000+08:00`  
查询参数 `after` 会先解析，再规范成同一格式后比较（可传 `Z` / `+00:00` / `+08:00` 等）。

**去重：** 唯一键为 `(message_id, recipient)`。  
同一 Message-ID 发给不同地址可各存一份；同一地址重投使用 `INSERT OR IGNORE`，不报错。

**容量：** 每次入库后，在同一 D1 `batch()` 事务内按 `received_at DESC, id DESC` 全局只留 50 行（不是按地址各 50）。

## API

- 基址将下文 `https://YOUR_WORKER` 换成你的 Worker URL 或自定义域名  
- 响应均为 JSON  

| 结果 | 格式 |
|------|------|
| 成功 | `{"success":true,"data":...}` |
| 失败 | `{"success":false,"error":{"code":"...","message":"..."}}` |

常见错误码：`bad_request`（400）、`not_found`（404）、`internal_error`（500）。

### 根路径伪装

浏览器直接打开域名（`GET /`）会返回仿 **nginx 默认欢迎页**（`Server: nginx`），不暴露 API。  
未知非 `/api/*` 路径返回仿 nginx 的 404 页。接口仍走下方路径。

### `GET /health`

健康检查（JSON，供探活；不伪装）。

```bash
curl https://YOUR_WORKER/health
```

### `POST /api/address`

生成收信地址。无 body 时随机前缀；可指定 `prefix`（`a-z0-9._-`，最长 63）。

```bash
# 随机
curl -X POST https://YOUR_WORKER/api/address

# 指定前缀
curl -X POST https://YOUR_WORKER/api/address \
  -H 'content-type: application/json' \
  -d '{"prefix":"1111"}'
```

非法 JSON 返回 **400**。

### `GET /api/messages`

按收件地址列邮件（最多 50）。

| 参数 | 必填 | 说明 |
|------|------|------|
| `address` | 是 | 收件地址 |
| `after` | 否 | 只返回此时间之后的邮件 |
| `sender` | 否 | 发件地址精确匹配（不区分大小写） |
| `subject` | 否 | 标题包含匹配；`%` `_` 当普通字符 |

```bash
curl -G https://YOUR_WORKER/api/messages \
  --data-urlencode 'address=1111@example.com'
```

### `GET /api/messages/latest`

条件同列表接口，只返回**最新一封**；无匹配时 `message` 为 `null`。

```bash
curl -G https://YOUR_WORKER/api/messages/latest \
  --data-urlencode 'address=1111@example.com' \
  --data-urlencode 'after=2026-07-12T20:00:00.000+08:00' \
  --data-urlencode 'sender=no-reply@example.net' \
  --data-urlencode 'subject=Welcome'
```

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "8cff...",
      "message_id": "<abc@example.net>",
      "sender": "no-reply@example.net",
      "recipient": "1111@example.com",
      "subject": "Welcome",
      "text_content": "Hello",
      "html_content": "<p>Hello</p>",
      "raw_size": 1234,
      "received_at": "2026-07-12T20:30:00.000+08:00"
    }
  }
}
```

### `GET|DELETE /api/messages/:id`

按本地 `id` 获取或删除单封邮件。

```bash
curl https://YOUR_WORKER/api/messages/MESSAGE_ID
curl -X DELETE https://YOUR_WORKER/api/messages/MESSAGE_ID
```

### `DELETE /api/messages?address=`

删除某收件地址下全部邮件。

```bash
curl -X DELETE -G https://YOUR_WORKER/api/messages \
  --data-urlencode 'address=1111@example.com'
```

## Python 轮询示例

启动时记录当前东八区时间，只等之后到达的新邮件；优先打印纯文本，否则打印 HTML。

```bash
python -m pip install -r examples/requirements.txt
python examples/poll_latest.py https://YOUR_WORKER 1111@example.com
```

可选：`--interval`（秒，默认 2）、`--timeout`（秒，默认 120）。

## 本地开发

```bash
npm run db:migrate:local
npm run dev
```

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地 Worker |
| `npm test` | 单元测试 |
| `npm run typecheck` | 类型检查 |
| `npm run check` | typecheck + test |
| `npm run deploy` | 部署到 Cloudflare |
| `npm run db:migrate:local` / `db:migrate:remote` | 应用 D1 迁移 |

HTTP API 可本地测；真实收信需部署并配置 Catch-all。

## 安全说明

当前接口**无鉴权**。知道 URL 的人可以读、删邮件。

正式使用建议：

- 前挂 Cloudflare Access，或自建 API Token 校验  
- 勿在日志中打印邮件正文  
- 勿把 `wrangler.toml`、密钥提交进仓库  

## 许可与范围

本仓库为可自部署示例，默认不包含生产级鉴权与多租户隔离。按需自行加固后再对外暴露。
