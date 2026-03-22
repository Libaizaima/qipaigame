# AM-GAME 部署与维护手册

> **最后更新**: 2026-03-22  
> **适用版本**: v1.0  
> **目标架构**: x86 Linux 服务器 (PM2 + Docker)

---

## 目录

1. [环境要求](#1-环境要求)
2. [服务器初始化](#2-服务器初始化)
3. [项目部署](#3-项目部署)
4. [Nginx 或 FRP 反向代理](#4-nginx-或-frp-反向代理)
5. [SSL 证书配置](#5-ssl-证书配置)
6. [环境变量说明](#6-环境变量说明)
7. [数据库管理](#7-数据库管理)
8. [日常运维与监控](#8-日常运维与监控)
9. [备份与恢复](#9-备份与恢复)
10. [扩容与性能调优](#10-扩容与性能调优)
11. [故障排查](#11-故障排查)
12. [安全加固](#12-安全加固)
13. [版本更新流程](#13-版本更新流程)

---

## 1. 环境要求

### 硬件最低配置

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 磁盘 | 20 GB SSD | 50 GB SSD |

### 软件依赖

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Docker | ≥ 24.0 | 仅用于部署 PostgreSQL / Redis |
| Node.js | ≥ 20 LTS | 原生运行 API 和 Frontend |
| PM2 | 最新版 | Node.js 进程守护 |
| Nginx/FRP | 最新版 | 反向代理及内网穿透 |

---

## 2. 服务器初始化

### 2.1 安装基础环境

```bash
# 安装 Node.js (这里以 22.x 为例)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs nginx

# 安装 PM2 (Node.js 进程管家)
sudo npm install -g pm2
pm2 startup
```

### 2.2 安装 Docker (仅用于数据库)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2.3 防火墙及项目目录

```bash
# 开放必要外网端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 创建部署目录
sudo mkdir -p /opt/am-game
sudo chown $USER:$USER /opt/am-game
```

---

## 3. 项目部署

### 3.1 启动数据库及缓存 (Docker)

在 `/opt/am-game` 目录下，使用精简后的 `docker-compose.yml` 仅运行数据库和缓存：

```bash
cd /opt/am-game
docker compose up -d postgres redis
```

### 3.2 部署后端 API (PM2 原生运行)

由于生产环境采用原生部署方案，`DATABASE_URL` 需指向 `localhost` 而非 Docker network 内部地址。

```bash
cd /opt/am-game/apps/api

# 1. 准备环境变量 (确保 DATABASE_URL 指向 localhost)
cp .env.example .env
sed -i "s/@postgres:5432/@localhost:5432/" .env
sed -i "s/redis:\/\/redis:6379/redis:\/\/localhost:6379/" .env

# 2. 安装依赖并生成 Prisma Client
npm ci
npx prisma generate

# 3. 推送数据库结构并写入初始 Seed
npx prisma db push --accept-data-loss
npx prisma db seed

# 4. 构建并使用 PM2 启动
npm run build
npx pm2 start dist/src/main.js --name am-game-api
```

### 3.3 部署前端 Web (PM2 原生运行)

前往前端目录，配置指向刚才搭建的 API 接口：

```bash
cd /opt/am-game/apps/web

# 配置 API 及 WS 地址，反代后共享同域时，可用纯路径 /api 和 /
echo "NEXT_PUBLIC_API_URL=/api" > .env
echo "NEXT_PUBLIC_WS_URL=" >> .env

# 构建并启动 NextJS
npm ci
npm run build
npx pm2 start npm --name am-game-web -- run start
npx pm2 save
```

---

## 4. Nginx 或 FRP 反向代理

将前后端端口 (`6989` 和 `3001` 或 `3000`) 统一映射到域名/公网。

**FRP (客户端 frpc.toml 参考配置):**

这里采用基于 TCP 分端口投递，或者基于 HTTP 路径分流投递到后端 VPS 的 Nginx。如果你想完全交给 FRP 处理：

```toml
[web_frontend]
type = "tcp"
local_ip = "127.0.0.1"
local_port = 3000
remote_port = 8000

[web_api]
type = "tcp"
local_ip = "127.0.0.1"
local_port = 6989
remote_port = 8001
```

在公网 VPS 的 Nginx：
```nginx
upstream api_backend { server 127.0.0.1:8001; }
upstream web_frontend { server 127.0.0.1:8000; }

server {
    listen 80;
    server_name your-domain.com;

    location /api/ { proxy_pass http://api_backend; }
    location /socket.io/ {
        proxy_pass http://api_backend;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location / { proxy_pass http://web_frontend; }
}
```

---

## 5. SSL 证书配置 (VPS)

请在你的**公网机器 (VPS)** 上，使用 Certbot 自动化申请：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 6. 环境变量说明

| 变量名 | 说明 | 生产必改 |
|--------|------|---------|
| `DATABASE_URL` | PG连接字符串 (`postgresql://postgres:密码@localhost:5432/am_game`) | ✅ |
| `JWT_SECRET` | 用户令牌密钥 (`openssl rand -hex 32` 生成) | ✅ |
| `PORT` | 建议 `6989`，保持不变即可 | ❌ |
| `NEXT_PUBLIC_API_URL` | 前端配置给 SSR 的请求路径 (`/api`) | ❌ |

---

## 7. 数据库管理

由于使用 PM2 原生部署，管理数据库非常方便。在 `apps/api` 目录下直接运行：

```bash
# 自动生成结构变更并建表
npx prisma db push 

# 打开本地浏览器可视化管理面板
npx prisma studio 

# 命令行进入 PostgreSQL
docker compose exec postgres psql -U postgres -d am_game
```

---

## 8. 日常运维与监控

### PM2 常用命令：

```bash
pm2 list                  # 查看所有进程和资源使用情况
pm2 monit                 # 交互式监控大屏 (包含 CPU、内存、实时日志)
pm2 logs am-game-api      # 查看 API 实时的 Console 打印日志
pm2 restart am-game-api   # 重启 API
```

---

## 9. 备份与恢复

```bash
# 备份 (在项目根目录下通过 Docker 容器内执行 pg_dump)
docker compose exec postgres pg_dump -U postgres am_game > backup_$(date +%Y%m%d).sql

# 恢复
cat backup_xxx.sql | docker compose exec -T postgres psql -U postgres -d am_game
```

---

## 10. 扩容与性能调优

如果需要分配给 Node.js 更多内存上限，可以如此配置 PM2 启动参数：

```bash
# 分配 2GB 内存
NODE_OPTIONS="--max-old-space-size=2048" pm2 restart am-game-api
```

---

## 11. 故障排查

| 现象 | 可能原因 | 解决方案 |
|------|---------|---------|
| API 不通 / 端口未监听 | Prisma 连不上库 | `pm2 logs am-game-api`，检查 `.env` 中的 `localhost` 以及 Postgres 密码是否匹配。 |
| NextJS 白屏 / SSR 报错 | fetch URL 错误 | 检查 `apps/web/.env` 里的 `NEXT_PUBLIC_API_URL`，必须兼顾浏览器 CSR 与服务端 SSR 寻址需求。 |
| WebSocket 连不上 | Nginx 未配 Upgrade | VPS 上的 Nginx 针对 `/socket.io/` 必须加上 `proxy_set_header Upgrade $http_upgrade;` |

---

## 12. 安全加固

1. **禁用密码登录**：修改 `/etc/ssh/sshd_config` 并 `PasswordAuthentication no`。
2. **强密码**：修改 `.env` 日志数据库等密码为无规律字符串。
3. **隔离性**：Postgres 和 Redis 被 Docker 限制只在桥接网络及 localhost 打开映射，不要把 `5432` 放火墙开发到公网。

---

## 13. 版本更新流程

原生 PM2 下执行更新，流程最为简洁且做到近乎零停机（0-downtime）：

```bash
# 1. 更新代码
cd /opt/am-game
git pull origin main

# 2. API 端热更新
cd apps/api
npm ci && npx prisma db push && npm run build
pm2 reload am-game-api

# 3. 前端 Web 更新
cd ../web
npm ci && npm run build
pm2 reload am-game-web
```
