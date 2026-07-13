# Cloudflare Catch-all Mailbox API

一个只负责收信和读取正文的轻量邮件 API。Cloudflare Email Routing 的 Catch-all 把邮件交给 Email Worker，Worker 使用 `postal-mime` 解析后写入 D1。系统全局只保留按接收时间排序的最新 50 封邮件，不保存附件，也不使用定时任务。

## 保存的数据

每封邮件只保存以下字段：`id`、`message_id`、`sender`、`recipient`、`subject`、`text_content`、`html_content`、`raw_size`、`received_at`。

`received_at` 是 Worker 实际收到邮件时生成的 UTC ISO 8601 时间。每次入库后，插入和全局清理在同一个 D1 `batch()` 事务中顺序执行，按 `received_at DESC, id DESC` 保留最新 50 行。并发投递不会在单次插入和清理之间穿插。

## 部署

要求：Cloudflare 账户、已托管到 Cloudflare 的域名、Node.js 20+。

```bash
npm install
npx wrangler login
npx wrangler d1 create mailbox-db
cp wrangler.toml.example wrangler.toml
```

把创建 D1 后输出的 `database_id` 填入 `wrangler.toml`，并把 `MAIL_DOMAIN` 改成你的收信域名。然后执行：

```bash
npm run db:migrate:remote
npm run check
npm run deploy
```

在 Cloudflare 控制台进入 **Email > Email Routing > Routing rules**：

1. 启用 Email Routing 并按提示添加 DNS 记录。
2. 新建 Catch-all 规则。
3. 动作选择 **Send to a Worker**，目标选择本项目部署出的 Worker。
4. 启用规则。

Catch-all 生效后，`任意前缀@你的域名` 都能收信。`POST /api/address` 不会创建真实邮箱账户，只会生成或返回一个可用于 Catch-all 的地址。

## API

所有响应均为 JSON。成功格式为 `{"success":true,"data":...}`，失败格式为 `{"success":false,"error":{"code":"...","message":"..."}}`。

### 健康检查

```http
GET /health
```

### 获取收信地址

不传内容时随机生成地址：

```bash
curl -X POST https://YOUR_WORKER/api/address
```

指定前缀：

```bash
curl -X POST https://YOUR_WORKER/api/address \
  -H 'content-type: application/json' \
  -d '{"prefix":"1111"}'
```

### 查询邮件列表

```bash
curl -G https://YOUR_WORKER/api/messages \
  --data-urlencode 'address=1111@example.com'
```

可选查询参数：

- `after`：只返回此 ISO 8601 时间之后收到的邮件。
- `sender`：按完整发件地址精确筛选，不区分大小写。
- `subject`：按标题包含关系筛选，`%` 和 `_` 会作为普通字符处理。

三个筛选参数也适用于最新邮件接口：

```bash
curl -G https://YOUR_WORKER/api/messages/latest \
  --data-urlencode 'address=1111@example.com' \
  --data-urlencode 'after=2026-07-12T12:00:00Z' \
  --data-urlencode 'sender=no-reply@example.net' \
  --data-urlencode 'subject=Welcome'
```

该接口只返回最新一封匹配邮件：

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
      "received_at": "2026-07-12T12:30:00.000Z"
    }
  }
}
```

没有匹配邮件时 `message` 为 `null`。

### 按 ID 获取或删除

```bash
curl https://YOUR_WORKER/api/messages/MESSAGE_ID
curl -X DELETE https://YOUR_WORKER/api/messages/MESSAGE_ID
```

### 删除某地址的全部邮件

```bash
curl -X DELETE -G https://YOUR_WORKER/api/messages \
  --data-urlencode 'address=1111@example.com'
```

## Python 轮询最新正文

```bash
python -m pip install -r examples/requirements.txt
python examples/poll_latest.py https://YOUR_WORKER 1111@example.com
```

脚本启动时记录当前时间，只轮询之后到达的新邮件。收到邮件后优先打印纯文本正文；纯文本为空时打印 HTML 正文。

## 本地开发

```bash
npm run db:migrate:local
npm run dev
```

HTTP API 可以在本地测试。真实 Email Routing 投递需要部署到 Cloudflare 后配置 Catch-all。

## 安全建议

示例接口没有身份验证，知道 Worker URL 的人可能读取或删除邮件。正式使用时建议在 Worker 前增加 Cloudflare Access，或添加 API Token 校验，并避免在日志中输出邮件正文。
