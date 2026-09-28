# Orbit API Documentation (v1)

Base URL: `http://localhost:4000` (or production edge endpoint)  
Authentication: Bearer JWT (`Authorization: Bearer <supabase_access_token>`)  
In development: fallback to `Authorization: Bearer dev-token`

---

## 1. Health Check

### `GET /health`
Returns the operational health and uptime status of the backend service.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "orbit-backend",
  "timestamp": "2026-09-28T21:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 2. Real-Time Chat & Streaming

### `POST /api/chat/stream`
Establishes a Server-Sent Events (SSE) stream that delivers chunked token responses from Claude 3.5 Sonnet / Haiku.

**Request Body (`application/json`)**:
```json
{
  "content": "What are my high-priority tasks and calendar items for tomorrow?",
  "conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", // optional: creates new if omitted
  "custom_agent_id": null
}
```

**SSE Stream Events (`text/event-stream`)**:

1. `session_start`
```json
data: {
  "type": "session_start",
  "conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "user_message_id": "a3b98401-4478-4389-9e8d-8064ea472714",
  "assistant_message_id": "b18b4502-3928-4f81-a9e1-74892cfae891"
}
```

2. `token` (Repeated for each token delta)
```json
data: {
  "type": "token",
  "text": "Based on "
}
```

3. `tool_confirmation_required` (When a consequential action is drafted)
```json
data: {
  "type": "tool_confirmation_required",
  "action_id": "782194a2-e618-4721-a3f1-4328df819231",
  "tool_name": "send_email",
  "permission_level": "write",
  "action_payload": {
    "to": "alex@example.com",
    "subject": "Q3 Roadmap Sync",
    "body": "Hi Alex, confirming our 2 PM sync tomorrow."
  },
  "description": "Send email to alex@example.com regarding 'Q3 Roadmap Sync'"
}
```

4. `message_saved`
```json
data: {
  "type": "message_saved",
  "message": {
    "id": "b18b4502-3928-4f81-a9e1-74892cfae891",
    "conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "role": "assistant",
    "content": "...",
    "model": "claude-3-5-sonnet-20241022",
    "created_at": "2026-09-28T21:00:03.000Z"
  }
}
```

5. `done`
```json
data: {
  "type": "done",
  "conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "assistant_message_id": "b18b4502-3928-4f81-a9e1-74892cfae891"
}
```

---

## 3. Conversations

### `GET /api/conversations`
Retrieves all active conversations for the authenticated user, ordered by pinned status and last updated timestamp.

### `POST /api/conversations`
Explicitly initializes a new conversation thread.

### `GET /api/conversations/:id/messages`
Retrieves the chronological list of messages in a conversation.

### `DELETE /api/conversations/:id`
Deletes a conversation and its messages.

---

## 4. User Profile, Privacy & GDPR

### `GET /api/user/me`
Retrieves the user profile and notification/quiet-hours preferences.

### `PATCH /api/user/settings`
Updates quiet hours, morning brief schedule, and proactive nudges.

### `POST /api/user/export`
Generates a complete JSON payload containing all user memories, conversation logs, and tasks.

### `DELETE /api/user/account`
GDPR right-to-be-forgotten endpoint that cascades and deletes all user records from Postgres & pgvector.
