# ===== Build Stage =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 编译 prisma.config.ts → prisma.config.js (生产环境需要)
RUN npx tsc prisma.config.ts --esModuleInterop --module commonjs --skipLibCheck --outDir .tmp_config 2>/dev/null || true
# 如果 tsc 输出到了 .tmp_config，就用那个；否则用 nest build 的 dist 产物
RUN if [ -f .tmp_config/prisma.config.js ]; then cp .tmp_config/prisma.config.js .; fi

# 构建 NestJS
RUN npm run build

# ===== Production Stage =====
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# 从 builder 拷贝构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Prisma 7: prisma.config.js (已编译) + dotenv
COPY --from=builder /app/dist/prisma.config.js ./prisma.config.js
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

# 运行脚本
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 6989

CMD ["./entrypoint.sh"]
