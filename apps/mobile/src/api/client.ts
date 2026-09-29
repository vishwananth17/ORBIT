import Constants from 'expo-constants';
import { StreamEvent, Conversation, Message, User, NotificationSettings, Memory } from '@kairo/shared';

// Determine backend API URL (supports Android Emulator 10.0.2.2, iOS Simulator localhost, or Expo config)
const getApiBaseUrl = (): string => {
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl) return extraUrl;
  return 'http://localhost:4000';
};

export const API_BASE_URL = getApiBaseUrl();

export interface StreamChatOptions {
  content: string;
  conversationId?: string;
  customAgentId?: string | null;
  authToken?: string | null;
  signal?: AbortSignal;
  onEvent: (event: StreamEvent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export const apiClient = {
  // Generic authenticated fetch
  async request<T>(
    endpoint: string,
    options: RequestInit & { token?: string | null } = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['Authorization'] = 'Bearer dev-token';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  },

  // Conversations API
  async listConversations(token?: string | null): Promise<Conversation[]> {
    const res = await this.request<{ conversations: Conversation[] }>('/api/conversations', { token });
    return res.conversations;
  },

  async createConversation(title?: string, token?: string | null): Promise<Conversation> {
    const res = await this.request<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
      token,
    });
    return res.conversation;
  },

  async getMessages(conversationId: string, token?: string | null): Promise<Message[]> {
    const res = await this.request<{ messages: Message[] }>(
      `/api/conversations/${conversationId}/messages`,
      { token }
    );
    return res.messages;
  },

  async deleteConversation(conversationId: string, token?: string | null): Promise<void> {
    await this.request(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
      token,
    });
  },

  // Memory Vault API
  async listMemories(category?: string, search?: string, token?: string | null): Promise<Memory[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ memories: Memory[] }>(`/api/memories${queryStr}`, { token });
    return res.memories;
  },

  async createMemory(
    data: { content: string; category?: string; importance_score?: number; is_pinned?: boolean },
    token?: string | null
  ): Promise<Memory> {
    const res = await this.request<{ memory: Memory }>('/api/memories', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
    return res.memory;
  },

  async updateMemory(
    id: string,
    data: { content?: string; importance_score?: number; is_pinned?: boolean; is_archived?: boolean },
    token?: string | null
  ): Promise<Memory> {
    const res = await this.request<{ memory: Memory }>(`/api/memories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    });
    return res.memory;
  },

  async deleteMemory(id: string, token?: string | null): Promise<void> {
    await this.request(`/api/memories/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  // Actions & Two-Phase Confirmation API
  async confirmAction(
    actionId: string,
    approved: boolean,
    modifiedPayload?: Record<string, unknown>,
    token?: string | null
  ): Promise<{ success: boolean; status: string; result?: unknown }> {
    return this.request('/api/actions/confirm', {
      method: 'POST',
      body: JSON.stringify({ action_id: actionId, approved, modified_payload: modifiedPayload }),
      token,
    });
  },

  // Third-Party Integrations (OAuth)
  async listIntegrations(token?: string | null): Promise<Array<{ provider: string; name: string; description: string; is_connected: boolean }>> {
    const res = await this.request<{ integrations: Array<{ provider: string; name: string; description: string; is_connected: boolean }> }>('/api/integrations', { token });
    return res.integrations;
  },

  async connectIntegration(provider: string, token?: string | null): Promise<void> {
    await this.request(`/api/integrations/${provider}/connect`, {
      method: 'POST',
      token,
    });
  },

  async disconnectIntegration(provider: string, token?: string | null): Promise<void> {
    await this.request(`/api/integrations/${provider}`, {
      method: 'DELETE',
      token,
    });
  },

  // User Profile & Settings
  async getProfile(token?: string | null): Promise<{ user: User; settings: NotificationSettings | null }> {
    return this.request<{ user: User; settings: NotificationSettings | null }>('/api/user/me', { token });
  },

  async updateSettings(settings: Partial<NotificationSettings>, token?: string | null): Promise<NotificationSettings> {
    const res = await this.request<{ settings: NotificationSettings }>('/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
      token,
    });
    return res.settings;
  },

  async exportData(token?: string | null): Promise<Record<string, unknown>> {
    return this.request('/api/user/export', { method: 'POST', token });
  },

  async deleteAccount(token?: string | null): Promise<void> {
    await this.request('/api/user/account', { method: 'DELETE', token });
  },

  // Real-time SSE Chat Stream
  async streamChat(opts: StreamChatOptions): Promise<void> {
    const { content, conversationId, customAgentId, authToken, signal, onEvent, onError, onComplete } = opts;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : 'Bearer dev-token',
        },
        body: JSON.stringify({
          content,
          conversation_id: conversationId,
          custom_agent_id: customAgentId,
        }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Streaming failed: ${response.statusText}`);
      }

      // Check for streaming body support
      if (response.body && typeof (response.body as any).getReader === 'function') {
        const reader = (response.body as any).getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6)) as StreamEvent;
                onEvent(parsed);
              } catch (parseErr) {
                console.warn('[SSE Parse Warning]:', parseErr);
              }
            }
          }
        }
      } else {
        // Fallback for environments buffering response (e.g. standard mobile fetch)
        const text = await response.text();
        const lines = text.split('\n\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6)) as StreamEvent;
              onEvent(parsed);
            } catch {
              // ignore partial chunks
            }
          }
        }
      }

      onComplete();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[SSE Stream Aborted]');
        onComplete();
      } else {
        onError(err);
      }
    }
  },
};
