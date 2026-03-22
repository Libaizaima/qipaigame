# AM-GAME 棋牌游戏平台项目文档

这是 AM-GAME 棋牌游戏（百家乐、骰宝）的核心工程目录。本项目包含完整的后端游戏引擎、API服务、以及前端Web页面。

## 1. 核心技术栈

### 后端 (apps/api)
*   **框架**: NestJS (Node.js) + TypeScript
*   **数据库 ORM**: Prisma 7
*   **数据库**: PostgreSQL 16
*   **缓存与分布式锁**: Redis 7
*   **实时通信**: `@nestjs/websockets` + Socket.io
*   **进程守护**: PM2

### 前端 (apps/web)
*   **框架**: Next.js 14+ (React)
*   **UI/样式**: 纯 CSS (Vanilla CSS, 玻璃拟物态, 深色赌场风格)
*   **实时通信**: `socket.io-client`
*   **状态管理**: React Context API
*   **进程守护**: PM2

---

## 2. 目录结构

```text
am-game/
├── docker-compose.yml       # 用于仅启动 Postgres 和 Redis 的容器环境
├── DEPLOYMENT.md            # [重要] PM2 服务器原生部署及运维操作手册
├── README.md                # 也就是本文档，项目信息总览
└── apps/
    ├── api/                 # 后端 API 及核心游戏引擎代码
    │   ├── prisma/          # 数据库建模 (schema.prisma) 及初始化脚本 (seed.ts)
    │   ├── src/             
    │   │   ├── auth/        # 权限与注册登录 (JWT)
    │   │   ├── wallet/      # 钱包余额及资金流水核心
    │   │   ├── game/        # 包含百家乐、骰子发牌逻辑的核心 Engine
    │   │   ├── round/       # 控制局数、状态机、发牌定时的轮次管理
    │   │   ├── bet/         # 处理前端下注、校验余额
    │   │   ├── settlement/  # 开奖后瞬间结算所有人输赢的模块
    │   │   └── ws/          # 处理 WebSocket 连接和事件推送
    │   └── .env             # 后端环境变量
    └── web/                 # 前端 Next.js 界面
        ├── src/
        │   ├── app/         # 页面路由 (首页、登录、注册、百家乐、骰宝)
        │   ├── components/  # 复用组件 (筹码、扑克牌、投注区等)
        │   ├── contexts/    # 用户状态、余额状态管理
        │   └── lib/         # API 封装和 Socket 实例管理
        └── .env             # 前端环境变量
```

---

## 3. 游戏核心运行逻辑

本项目当前设计采用的是 **“多人直播大厅模式” (Live Multiplayer Casino)**。

### 状态机流转 (Game Loop)
整个房间（游戏本身）是通过时间的不断流逝来驱动的，服务器中跑着一个不受人为中断的计时器引擎：

1.  **WAITING (等待中)**：新的一局即将开始准备时间（约1~2秒）。
2.  **BETTING (下注中)**：
    *   开始 20 秒倒计时（百家乐）或 15 秒（骰宝）。
    *   此时系统接收所有玩家的 `POST /bets` 请求进行自由下注。
3.  **CLOSED (封盘)**：倒计时达到 0 的瞬间，任何新下注被拒绝。
4.  **DRAWING (开奖中)**：
    *   系统调用 `GameEngine` 生成随机牌面或骰子点数。
5.  **SETTLING (结算中)**：
    *   执行资金结算逻辑。
    *   遍历本局所有下注清单 -> 对比开奖结果和赔率 -> 计算输赢 -> 并发操作数据库进行资金退补、流水入库。
    *   通过 WebSocket 发送 `round_result` 给所有在线连接的玩家。
6.  再次回到 WAITING 初始化...周而复始。

---

## 4. 钱包资金严格控制

*   **唯一性**: 下注时前端传递 `idempotencyKey` 以防网络抖动导致的重复扣钱（幂等防护）。
*   **事务性**: 使用 PostgreSQL 数据库的 `Prisma 事务 (Transaction)`。所有下注行为保证【扣余额】与【创建注单】同时成功或失败。
*   **数据追溯**: 所有资金变化（包括注册赠送、下注扣除、中奖派发）都会记录在 `wallet_transactions` 流水表中。

---

## 5. 开发与运行方式 (Local/VPS)

详细服务器部署教程可见 `DEPLOYMENT.md`，这里是快速本地开发的命令速览。

**前置依赖**：本地必须安装 Node 20+，并能够运行 Docker。

### 跑起数据库
```bash
# 启动 PostgreSQL 5432 和 Redis 6379 
docker compose up -d postgres redis
```

### 运行后端 (Nest.js)
```bash
cd apps/api
cp .env.example .env     # 根据示例配好环境
npm install
npx prisma db push       # 同步模型建表
npx prisma db seed       # 生成测试游戏房间、Admin及初始玩家账号
npm run start:dev        # 本地开发模式启动 (监听 6989 端口)
```

### 运行前端 (Next.js)
```bash
cd apps/web
# 确保 .env 内包含：
# NEXT_PUBLIC_API_URL=http://localhost:6989/api
# NEXT_PUBLIC_WS_URL=http://localhost:6989
npm install
npm run dev              # 启动测试，通常监听 3000 或 3001
```

---

## 6. 后续可扩展性

本项目遵循了松散耦合与重度模块化的设计。未来若想进行改装：

*   **改为单机点击游玩**：关闭 `game` 模块里的 `game-loop.service` 轮询定时器，增加一个 `/api/play/baccarat` 接口让客户端自行发送请求并瞬间触发上方第 4 步（Drawing）并由接口返回。
*   **增加新游戏模式**：在 `GameEngine` 添加新的逻辑（如“轮盘”、“21点”），并在数据库新增一个对应的 `Game` 条目（`npx prisma studio` 可视化新增即可）。
*   **防爆庄机制**：目前系统对于单房间没有整体吃注资金池设计。在大型生产时可以在 `round` 生成或 `bet` 拦截处做资金上下限硬限制校验。
