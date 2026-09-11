# 03 Nginx 与 HTTPS

## Nginx 配置示例

`/etc/nginx/sites-available/mymobilepage`：

```nginx
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 证书（certbot 自动签）
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # 上传大小（数据导出 / 图片）
    client_max_body_size 20M;

    # 日志
    access_log /var/log/nginx/mymobilepage.access.log;
    error_log  /var/log/nginx/mymobilepage.error.log;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ==================== 后台静态站点 ====================
    location /admin/ {
        alias /var/www/mymobilepage/admin/;
        try_files $uri $uri/ /admin/index.html;   # SPA 路由 fallback
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # ==================== 客户端静态站点 ====================
    location /client/ {
        alias /var/www/mymobilepage/client/;
        try_files $uri $uri/ /client/index.html;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # ==================== 后台 API ====================
    location /api/admin/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # ==================== 客户端 API ====================
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # ==================== 根路径 → 后台 ====================
    location / {
        return 302 /admin/;
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/mymobilepage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS 证书

```bash
# 用 certbot 申请 Let's Encrypt 免费证书
sudo certbot --nginx -d yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run
```

certbot 会自动在 nginx 配置里加上 `ssl_certificate` 指令，30 天前自动续期。

## 反代注意事项

- **`X-Forwarded-For`**：必须传，AuditInterceptor 才能正确记录客户端 IP
- **`X-Forwarded-Proto`**：让服务端知道是 HTTPS（影响 OAuth 等场景）
- **`client_max_body_size`**：与 admin 表单 / 图片上传有关，默认 1M 太小
- **SPA 路由 fallback**：`try_files ... /admin/index.html` 缺一不可，否则刷新页面会 404

## 监控 / 限流（生产化阶段补）

- **限流**：用 `limit_req_zone` 给 `/api/admin/auth/login` 加防爆破
- **监控**：Prometheus + node_exporter 抓 PM2 / Nginx 指标
- **告警**：Alertmanager 配置内存 / CPU / 5xx 阈值告警