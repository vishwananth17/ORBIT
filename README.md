# Orbit — Proactive, Memory-Driven Personal AI Agent

> **Production-grade mobile companion for ambitious individuals. Privacy-first, fast SSE streaming, continuous semantic memory via `pgvector`, and two-phase explicit confirmation for every consequential action.**

---

## Architecture Overview

- **Mobile Client**: React Native (Expo SDK 52) + TypeScript, Zustand state management, TanStack React Query, Dark/Light theme, Biometric unlock (FaceID/TouchID), and SSE streaming text renderer.
- **Backend API & Agent Core**: Node.js + Fastify (TypeScript), Anthropic Claude 3.5 Sonnet / Haiku integration with streaming SSE, Supabase JWT verification with RLS, BullMQ Redis background scheduler.
- **Data & Vector Layer**: PostgreSQL 16 with `pgvector` for 1536-dimensional semantic memory search with exponential recency decay, Redis 7 for queues and rate-limiting.
- **Security**: AES-256-GCM token encryption, Row-Level Security, full GDPR data export, and in-app account deletion.

---

## Monorepo Layout

```
orbit/
├── apps/
│   ├── mobile/         # React Native Expo iOS & Android App
│   └── backend/        # Fastify TypeScript Server & Claude Agent
├── packages/
│   ├── shared/         # Shared TypeScript DTOs, Zod Schemas & Constants
│   └── database/       # PostgreSQL + pgvector schema, RLS, migrations
├── docs/
│   ├── API_DOCUMENTATION.md
│   └── DEPLOYMENT_GUIDE.md
├── docker-compose.yml  # Local PostgreSQL (pgvector) + Redis
└── .env.example
```

---

## Quickstart Guide

### 1. Environment Setup
Copy the template configuration:
```bash
cp .env.example .env
```
Add your Anthropic API Key (or test with the built-in fallback simulator):
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Start PostgreSQL with pgvector & Redis
```bash
docker compose up -d
```

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Run Backend Server
```bash
npm run dev:backend
```
The server will be running at `http://localhost:4000`. Test health with:
```bash
curl http://localhost:4000/health
```

### 5. Run Mobile App
```bash
npm run dev:mobile
```
- Press `i` to launch in iOS Simulator
- Press `a` to launch in Android Emulator
- Press `w` to launch in Web browser
- Or scan QR code in Expo Go

---

## Testing

Run the agent prompt assembly and Zod validation test suite:
```bash
npm run test
```
