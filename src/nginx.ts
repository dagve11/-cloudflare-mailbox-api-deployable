/** 仿 nginx 默认页，用于域名直接访问时的伪装 */

const NGINX_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  server: "nginx",
  "x-content-type-options": "nosniff",
} as const;

const STYLES = `
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }
`.trim();

export function nginxWelcome(): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
${STYLES}
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
`;
  return new Response(html, { status: 200, headers: NGINX_HEADERS });
}

export function nginxNotFound(): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
<title>404 Not Found</title>
<style>
${STYLES}
</style>
</head>
<body>
<h1>404 Not Found</h1>
<p>nginx</p>
</body>
</html>
`;
  return new Response(html, { status: 404, headers: NGINX_HEADERS });
}
