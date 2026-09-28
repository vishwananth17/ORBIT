import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Conversation, Message } from '@kairo/shared';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  error: string | null;
  abortController: AbortController | null;

  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  newChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingText: '',
  isLoadingMessages: false,
  isLoadingConversations: false,
  error: null,
  abortController: null,

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const token = useAuthStore.getState().token;
      const convs = await apiClient.listConversations(token);
      set({ conversations: convs, isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  selectConversation: async (conversationId: string) => {
    if (get().isStreaming) {
      get().stopStreaming();
    }

    set({ activeConversationId: conversationId, isLoadingMessages: true, streamingText: '' });
    try {
      const token = useAuthStore.getState().token;
      const msgs = await apiClient.getMessages(conversationId, token);
      set({ messages: msgs, isLoadingMessages: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingMessages: false });
    }
  },

  newChat: () => {
    if (get().isStreaming) {
      get().stopStreaming();
    }
    set({
      activeConversationId: null,
      messages: [],
      streamingText: '',
      error: null,
    });
  },

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isStreaming) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional on web / unsupported hardware
    }

    const { activeConversationId, messages } = get();
    const token = useAuthStore.getState().token;
    const user = useAuthStore.getState().user;

    const tempUserMsgId = `temp-user-${Date.now()}`;
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      conversation_id: activeConversationId || 'pending',
      user_id: user?.id || 'dev-user',
      role: 'user',
      content: trimmed,
      model: 'claude-3-5-sonnet-20241022',
      created_at: new Date().toISOString(),
    };

    const abortController = new AbortController();

    set({
      messages: [...messages, optimisticUserMsg],
      isStreaming: true,
      streamingText: '',
      abortController,
      error: null,
    });

    let currentConvId = activeConversationId;
    let accumulatedText = '';

    await apiClient.streamChat({
      content: trimmed,
      conversationId: currentConvId || undefined,
      authToken: token,
      signal: abortController.signal,
      onEvent: (event) => {
        if (event.type === 'session_start') {
          currentConvId = event.conversation_id;
          set({ activeConversationId: event.conversation_id });
        } else if (event.type === 'token') {
          accumulatedText += event.text;
          set({ streamingText: accumulatedText });
        } else if (event.type === 'message_saved') {
          // Final assistant message received
          set((state) => ({
            messages: [...state.messages, event.message],
            streamingText: '',
          }));
        } else if (event.type === 'error') {
          set({ error: event.message });
        }
      },
      onError: (err) => {
        set({ error: err.message, isStreaming: false, abortController: null });
      },
      onComplete: () => {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // ignore
        }
        set({ isStreaming: false, streamingText: '', abortController: null });
        get().loadConversations();
      },
    });
  },

  stopStreaming: () => {
    const { abortController, streamingText, messages, activeConversationId } = get();
    if (abortController) {
      abortController.abort();
    }

    if (streamingText) {
      const partialMsg: Message = {
        id: `partial-${Date.now()}`,
        conversation_id: activeConversationId || '',
        user_id: 'assistant',
        role: 'assistant',
        content: streamingText + ' _[stopped]_',
        model: 'claude-3-5-sonnet-20241022',
        created_at: new Date().toISOString(),
      };
      set({
        messages: [...messages, partialMsg],
        streamingText: '',
      });
    }

    set({ isStreaming: false, abortController: null });
  },

  deleteConversation: async (conversationId: string) => {
    const token = useAuthStore.getState().token;
    await apiClient.deleteConversation(conversationId, token);
    const updatedConvs = get().conversations.filter((c) => c.id !== conversationId);
    set({
      conversations: updatedConvs,
      ...(get().activeConversationId === conversationId ? { activeConversationId: null, messages: [] } : {}),
    });
  },

  clearError: () => set({ error: null }),
}));
