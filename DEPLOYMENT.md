# AM-GAME 部署与维护手册

> **最后更新**: 2026-03-22  
> **适用版本**: v1.0  
> **目标架构**: x86 Linux 服务器

---

## 目录

1. [环境要求](#1-环境要求)
2. [服务器初始化](#2-服务器初始化)
3. [项目部署](#3-项目部署)
4. [Nginx 反向代理](#4-nginx-反向代理)
5. [SSL 证书配置](#5-ssl-证书配置)
6. [环境变量说明](#6-环境变量说明)
7. [数据库管理](#7-数据库管理)
8. [日常运维](#8-日常运维)
9. [监控与日志](#9-监控与日志)
10. [备份与恢复](#10-备份与恢复)
11. [扩容与性能调优](#11-扩容与性能调优)
12. [故障排查](#12-故障排查)
13. [安全加固](#13-安全加固)
14. [版本更新流程](#14-版本更新流程)

---

## 1. 环境要求

### 硬件最低配置

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 磁盘 | 20 GB SSD | 50 GB SSD |
| 带宽 | 5 Mbps | 20 Mbps |

### 软件依赖

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Docker | ≥ 24.0 | 容器化部署 |
| Docker Compose | ≥ 2.20 | 多服务编排 |
| Nginx | ≥ 1.24 | 反向代理 + SSL |
| Node.js | ≥ 20 LTS | 本地开发（可选） |
| Git | ≥ 2.30 | 代码拉取 |

---

## 2. 服务器初始化

### 2.1 安装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker compose version
```

### 2.2 安装 Nginx

```bash
sudo apt update && sudo apt install -y nginx
sudo systemctl enable nginx
```

### 2.3 配置防火墙

```bash
# 开放必要端口
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable

# 不要对外开放 3000 / 5432 / 6379
```

### 2.4 创建部署目录

```bash
sudo mkdir -p /opt/am-game
sudo chown $USER:$USER /opt/am-game
```

---

## 3. 项目部署

### 3.1 拉取代码

```bash
cd /opt/am-game
git clone <your-repo-url> .
```

### 3.2 配置环境变量

```bash
# 复制示例文件
cp apps/api/.env.example apps/api/.env

# 编辑生产环境配置
vim apps/api/.env
```

**生产环境 `.env` 模板：**

```env
DATABASE_URL="postgresql://postgres:你的强密码@postgres:5432/am_game?schema=public"
REDIS_URL="redis://redis:6379"

JWT_SECRET="使用 openssl rand -hex 32 生成"
JWT_EXPIRES_IN_SECONDS=900
JWT_REFRESH_EXPIRES_DAYS=7

PORT=3000
INITIAL_BALANCE=10000

BACCARAT_BETTING_SECONDS=20
DICE_BETTING_SECONDS=15
```

**生成安全的 JWT_SECRET：**

```bash
openssl rand -hex 32
```

### 3.3 修改 Docker Compose 密码

编辑 `docker-compose.yml`，修改 PostgreSQL 密码：

```yaml
# 将默认密码修改为强密码
environment:
  POSTGRES_PASSWORD: 你的强密码   # 必须与 .env 中的 DATABASE_URL 一致
```

### 3.4 构建并启动

```bash
# 构建镜像并启动所有服务
docker compose up -d --build

# 查看启动状态
docker compose ps

# 查看 API 服务日志
docker compose logs -f api
```

### 3.5 验证部署

```bash
# 检查 API 健康
curl http://localhost:6989/api/games

# 检查数据库连接
docker compose exec postgres pg_isready -U postgres

# 检查 Redis 连接
docker compose exec redis redis-cli ping
```

### 3.6 前端部署

```bash
cd apps/web

# 修改 API 地址
echo 'NEXT_PUBLIC_API_URL=https://your-domain.com/api' > .env.production
echo 'NEXT_PUBLIC_WS_URL=https://your-domain.com' >> .env.production

# 构建
npm ci && npm run build

# 方案 A：使用 Node.js 运行
npm run start -- -p 3001

# 方案 B：导出静态文件部署到 Nginx
# 需在 next.config.ts 中添加 output: 'export'
```

如需前端容器化，可在 `apps/web` 下创建 Dockerfile 并加入 docker-compose.yml。

---

## 4. Nginx 反向代理

### 4.1 创建站点配置

```bash
sudo vim /etc/nginx/sites-available/am-game
```

```nginx
upstream api_backend {
    server 127.0.0.1:6989;
}

upstream web_frontend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name your-domain.com;

    # ===== 后端 API =====
    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 请求大小限制
        client_max_body_size 10m;
    }

    # ===== WebSocket =====
    location /socket.io/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket 超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # ===== 前端 =====
    location / {
        proxy_pass http://web_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 4.2 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/am-game /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. SSL 证书配置

### 5.1 使用 Let's Encrypt（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 自动申请并配置证书
sudo certbot --nginx -d your-domain.com

# 验证自动续期
sudo certbot renew --dry-run
```

### 5.2 使用自有证书

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... 其余 location 配置同上
}

# HTTP → HTTPS 自动跳转
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

---

## 6. 环境变量说明

| 变量名 | 说明 | 默认值 | 生产必改 |
|--------|------|--------|---------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:postgres@localhost:5432/am_game` | ✅ |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` | ❌ |
| `JWT_SECRET` | JWT 签名密钥 | `change-this...` | ✅ |
| `JWT_EXPIRES_IN_SECONDS` | Access Token 有效时长（秒） | `900`（15分钟） | ❌ |
| `JWT_REFRESH_EXPIRES_DAYS` | Refresh Token 有效天数 | `7` | ❌ |
| `PORT` | API 服务端口 | `6989` | ❌ |
| `INITIAL_BALANCE` | 新用户初始筹码 | `10000` | 按需 |
| `BACCARAT_BETTING_SECONDS` | 百家乐下注倒计时（秒） | `20` | 按需 |
| `DICE_BETTING_SECONDS` | 骰宝下注倒计时（秒） | `15` | 按需 |

> ⚠️ **`JWT_SECRET` 和 `POSTGRES_PASSWORD` 必须在首次部署前修改**，否则存在严重安全风险。

---

## 7. 数据库管理

### 7.1 执行迁移

```bash
# 在 Docker 容器内执行
docker compose exec api npx prisma migrate deploy

# 本地开发环境
cd apps/api && npx prisma migrate dev --name <migration_name>
```

### 7.2 执行种子数据

```bash
docker compose exec api npx prisma db seed
```

### 7.3 数据库控制台

```bash
# 进入 PostgreSQL 命令行
docker compose exec postgres psql -U postgres -d am_game

# 常用查询
SELECT id, username, role, status FROM "User" LIMIT 20;
SELECT id, balance FROM "Wallet" LIMIT 20;
SELECT COUNT(*) FROM "Bet";
SELECT COUNT(*) FROM "GameRound";
```

### 7.4 Prisma Studio（可视化管理）

```bash
cd apps/api && npx prisma studio
# 浏览器打开 http://localhost:5555
```

---

## 8. 日常运维

### 8.1 常用命令速查

```bash
# ---- 服务管理 ----
docker compose up -d              # 启动所有服务
docker compose down                # 停止所有服务
docker compose restart api         # 重启 API 服务
docker compose ps                  # 查看运行状态

# ---- 日志查看 ----
docker compose logs -f api         # 实时查看 API 日志
docker compose logs -f --tail=100 api   # 最近 100 行
docker compose logs postgres       # 数据库日志

# ---- 资源监控 ----
docker stats                       # 容器资源使用
docker system df                   # 磁盘使用
```

### 8.2 定时清理

```bash
# 添加 crontab
crontab -e

# 每周日凌晨 3 点清理未使用的 Docker 资源
0 3 * * 0 docker system prune -f >> /var/log/docker-prune.log 2>&1

# 每天凌晨 2 点清理超过 30 天的过期会话
0 2 * * * docker compose exec -T postgres psql -U postgres -d am_game -c "DELETE FROM \"UserSession\" WHERE \"expiresAt\" < NOW();" >> /var/log/session-cleanup.log 2>&1
```

### 8.3 预置账号管理

| 账号 | 密码 | 角色 | 用途 |
|------|------|------|------|
| `admin` | `admin123456` | ADMIN | 管理后台 |
| `player1` | `player123456` | PLAYER | 测试用 |

> ⚠️ **部署到生产后务必修改管理员密码。**

---

## 9. 监控与日志

### 9.1 API 健康检查脚本

创建 `/opt/am-game/scripts/healthcheck.sh`：

```bash
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6989/api/games)

if [ "$RESPONSE" != "200" ]; then
    echo "[$(date)] API 异常！HTTP 状态码: $RESPONSE" >> /var/log/am-game-health.log
    docker compose -f /opt/am-game/docker-compose.yml restart api
    echo "[$(date)] 已尝试重启 API 服务" >> /var/log/am-game-health.log
fi
```

```bash
chmod +x /opt/am-game/scripts/healthcheck.sh

# 每 5 分钟检查一次
echo "*/5 * * * * /opt/am-game/scripts/healthcheck.sh" | crontab -
```

### 9.2 日志持久化

在 `docker-compose.yml` 的 `api` 服务中添加日志配置：

```yaml
api:
  logging:
    driver: "json-file"
    options:
      max-size: "50m"
      max-file: "5"
```

### 9.3 磁盘空间告警

```bash
#!/bin/bash
# /opt/am-game/scripts/disk-alert.sh
USAGE=$(df /opt/am-game | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 85 ]; then
    echo "[$(date)] 磁盘使用率 ${USAGE}%，需要清理！" >> /var/log/am-game-disk.log
fi
```

---

## 10. 备份与恢复

### 10.1 数据库备份

```bash
# 手动备份
docker compose exec postgres pg_dump -U postgres am_game > backup_$(date +%Y%m%d_%H%M%S).sql

# 自动备份脚本 /opt/am-game/scripts/backup.sh
#!/bin/bash
BACKUP_DIR="/opt/am-game/backups"
mkdir -p $BACKUP_DIR
FILENAME="$BACKUP_DIR/am_game_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose -f /opt/am-game/docker-compose.yml exec -T postgres \
  pg_dump -U postgres am_game | gzip > $FILENAME

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "[$(date)] 备份完成: $FILENAME ($(du -sh $FILENAME | cut -f1))" >> /var/log/am-game-backup.log
```

```bash
# 每天凌晨 4 点自动备份
chmod +x /opt/am-game/scripts/backup.sh
echo "0 4 * * * /opt/am-game/scripts/backup.sh" >> /tmp/crontab_tmp && crontab /tmp/crontab_tmp
```

### 10.2 恢复数据库

```bash
# 从备份文件恢复
gunzip -c backup_20260322.sql.gz | docker compose exec -T postgres psql -U postgres -d am_game

# 如果需要完全重建
docker compose exec -T postgres psql -U postgres -c "DROP DATABASE am_game; CREATE DATABASE am_game;"
gunzip -c backup_20260322.sql.gz | docker compose exec -T postgres psql -U postgres -d am_game
```

### 10.3 Redis 备份

Redis 的数据主要是缓存和分布式锁，丢失后可自动重建，通常无需单独备份。

---

## 11. 扩容与性能调优

### 11.1 PostgreSQL 调优

编辑 `docker-compose.yml`，添加 PostgreSQL 配置参数：

```yaml
postgres:
  command:
    - "postgres"
    - "-c" 
    - "max_connections=200"
    - "-c"
    - "shared_buffers=512MB"
    - "-c"
    - "effective_cache_size=1536MB"
    - "-c"
    - "work_mem=4MB"
    - "-c"
    - "log_min_duration_statement=1000"  # 慢查询日志 (≥1s)
```

### 11.2 Redis 调优

```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 11.3 Node.js 内存调优

```yaml
api:
  environment:
    NODE_OPTIONS: "--max-old-space-size=2048"
```

### 11.4 水平扩展

如需多实例部署：

1. 前端无状态，可直接多实例 + Nginx 负载均衡
2. 后端 API 可多实例，但需注意：
   - **游戏循环 (GameLoopService)** 需保持单实例运行，使用 Redis 分布式锁控制
   - **WebSocket** 需引入 Redis Adapter（`@socket.io/redis-adapter`）实现跨实例广播
3. PostgreSQL 和 Redis 保持单实例即可满足初期需求

---

## 12. 故障排查

### 12.1 常见问题

| 现象 | 可能原因 | 解决方案 |
|------|---------|---------|
| API 容器反复重启 | 数据库未就绪 | `docker compose logs api` 查看错误，确认 PostgreSQL 健康 |
| 连接数据库超时 | 密码不匹配 | 确认 `.env` 中 `DATABASE_URL` 与 `docker-compose.yml` 中的 `POSTGRES_PASSWORD` 一致 |
| WebSocket 连接失败 | Nginx 未配置 Upgrade | 检查 Nginx 的 `/socket.io/` location 是否包含 `proxy_set_header Upgrade` |
| 下注报错「房间不存在」 | 种子数据未执行 | `docker compose exec api npx prisma db seed` |
| JWT Token 过期 | 正常行为 | 前端应在 401 时自动调用 `/auth/refresh` |
| 游戏循环不启动 | 房间状态异常 | 检查 `GameRoom` 表中 `status` 是否为 `ACTIVE` |
| Redis 连接失败 | Redis 未启动 | `docker compose restart redis` |

### 12.2 诊断命令

```bash
# 检查各容器状态
docker compose ps

# 检查容器资源占用
docker stats --no-stream

# 进入 API 容器调试
docker compose exec api sh

# 测试数据库连接
docker compose exec api npx prisma db execute --stdin <<< "SELECT 1;"

# 检查端口占用
ss -tlnp | grep -E '6989|5432|6379'

# 查看网络连通性
docker compose exec api ping postgres
docker compose exec api ping redis
```

---

## 13. 安全加固

### 13.1 部署前必做清单

- [ ] 修改 `JWT_SECRET` 为随机强密码
- [ ] 修改 `POSTGRES_PASSWORD` 为强密码
- [ ] 修改管理员账号 `admin` 的密码
- [ ] 确认 5432（PostgreSQL）和 6379（Redis）端口不对外开放
- [ ] 配置 HTTPS（SSL 证书）
- [ ] 修改前端 CORS `origin` 为具体域名

### 13.2 Redis 安全

如 Redis 需要密码，修改 Docker Compose：

```yaml
redis:
  command: redis-server --requirepass your_redis_password
```

并更新 `.env`：

```env
REDIS_URL="redis://:your_redis_password@redis:6379"
```

### 13.3 SSH 安全

```bash
# 禁用密码登录，仅允许密钥
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 13.4 Nginx Rate Limiting

```nginx
# 在 http 块中添加
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

# 在 server 块中使用
location /api/auth/ {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://api_backend;
    # ...
}

location /api/ {
    limit_req zone=api_limit burst=50 nodelay;
    proxy_pass http://api_backend;
    # ...
}
```

---

## 14. 版本更新流程

### 14.1 标准更新步骤

```bash
cd /opt/am-game

# 1. 备份数据库
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建并重启（零停机）
docker compose up -d --build api

# 4. 执行数据库迁移（如有新迁移）
docker compose exec api npx prisma migrate deploy

# 5. 验证
curl http://localhost:3000/api/games
docker compose logs --tail=20 api
```

### 14.2 回滚

```bash
# 回退到上一个版本
git log --oneline -5                    # 查看提交历史
git checkout <previous_commit_hash>     # 切换到上一版本

# 重新构建
docker compose up -d --build api

# 如需回滚数据库（谨慎操作）
gunzip -c backups/am_game_<timestamp>.sql.gz | docker compose exec -T postgres psql -U postgres -d am_game
```

### 14.3 前端更新

```bash
cd apps/web
git pull origin main
npm ci && npm run build
# 重启前端服务
pm2 restart am-game-web  # 或 docker compose restart web
```

---

## 附录：项目结构总览

```
am-game/
├── docker-compose.yml          # 服务编排
├── apps/
│   ├── api/                    # 后端服务
│   │   ├── Dockerfile          # 多阶段构建
│   │   ├── entrypoint.sh       # 启动脚本 (迁移 + seed + 启动)
│   │   ├── .env                # 环境变量
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 数据模型定义
│   │   │   └── seed.ts         # 种子数据
│   │   └── src/                # 源代码 (9 个业务模块)
│   └── web/                    # 前端服务
│       ├── src/
│       │   ├── app/            # 8 个页面路由
│       │   ├── components/     # 共享组件
│       │   ├── contexts/       # 全局状态
│       │   └── lib/            # API + WebSocket 客户端
│       └── .env.production     # 生产环境前端配置
└── scripts/                    # 运维脚本 (需自行创建)
    ├── backup.sh
    ├── healthcheck.sh
    └── disk-alert.sh
```
