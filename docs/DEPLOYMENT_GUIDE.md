# Orbit Production Deployment & App Store Release Guide

---

## 1. Cloud Infrastructure (AWS & Supabase)

### 1.1 Backend Deployment (AWS ECS Fargate or Fly.io / Render)
1. **Docker Container**:
   Build the backend container using multi-stage Node 22 alpine image:
   ```bash
   docker build -t orbit-backend:latest -f apps/backend/Dockerfile .
   ```
2. **Environment Variables**:
   Configure AWS SSM Parameter Store or AWS Secrets Manager with:
   - `DATABASE_URL` (AWS RDS PostgreSQL 16 with `vector` extension enabled)
   - `REDIS_URL` (AWS ElastiCache Redis 7)
   - `SUPABASE_JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `TOKEN_ENCRYPTION_KEY` (AES-256-GCM 32-byte hex key)
3. **Application Load Balancer (ALB)**:
   - Enable HTTP/2 for low-latency streaming SSE connections.
   - Configure idle timeout to `300s` to prevent SSE stream disconnections during longer Claude thinking or tool executions.

### 1.2 Database (PostgreSQL with pgvector)
1. Connect to RDS instance and run the initial migration:
   ```bash
   npm run db:migrate
   ```
2. Verify HNSW index builds cleanly:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'memories';
   ```

---

## 2. Mobile App Deployment (Expo EAS Build)

### 2.1 Prerequisites
```bash
npm install -g eas-cli
eas login
eas project:init
```

### 2.2 Configure `eas.json`
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2.3 Build Commands
- **iOS TestFlight & App Store**:
  ```bash
  eas build --platform ios --profile production
  eas submit -p ios --latest
  ```
- **Android Google Play Store (AAB)**:
  ```bash
  eas build --platform android --profile production
  eas submit -p android --latest
  ```

---

## 3. Pre-Launch App Store & Play Store Checklist

### 3.1 Apple App Store Requirements
- [x] **Privacy Policy Screen**: Implemented in Settings with GDPR data export and account purge.
- [x] **Privacy Nutrition Labels**:
  - *Data Used to Track You*: None.
  - *Data Linked to You*: Contact Info (Email), User Content (Messages, Memories).
- [x] **Biometric Usage Description**: `NSFaceIDUsageDescription` specified in `app.json` ("Orbit uses FaceID to securely protect your personal agent memory and data").
- [x] **Account Deletion**: App Store Guideline 5.1.1(v) requires in-app account deletion. Implemented in `DELETE /api/user/account` with immediate database cascade.

### 3.2 Google Play Store Requirements
- [x] Target SDK version: Android 14+ (API 34).
- [x] Data Safety Section: Disclose encryption in transit (TLS 1.3) and encryption at rest.
- [x] Biometric Permissions: `USE_BIOMETRIC` and `USE_FINGERPRINT` configured in `app.json`.

---

## 4. Post-Launch Roadmap

### Phase 9: Multi-Device Real-time Sync
- WebSocket/Supabase Realtime channels for seamless state sync across mobile, tablet, and desktop companion.

### Phase 10: Wearable Integration (Apple Watch & Wear OS)
- Standalone Watch companion app for push-to-talk voice capture.
- Glanceable complication showing next agenda item and morning brief highlight.

### Phase 11: Team & Family Workspace Sharing
- Shared memory namespaces with selective visibility.
- Delegated agent execution across team members with granular permission scopes.
