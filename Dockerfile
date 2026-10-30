# Base Node.js 20 Alpine
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# 1. Dependencias
FROM base AS deps
WORKDIR /app
COPY panel/package.json panel/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 2. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY panel/ .

ARG NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyD_keI8HrRiu2zmXXi0JybhBFBu7xn8cbw"
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="zyveronplay.firebaseapp.com"
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID="zyveronplay"
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="zyveronplay.firebasestorage.app"
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="37945698653"
ARG NEXT_PUBLIC_FIREBASE_APP_ID="1:37945698653:web:4cf82d2f42f8c9644520b4"

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# 3. Runner de Produção Leve
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
