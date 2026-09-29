import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { useChatStore } from '../../store/chatStore';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { EmptyState } from '../../components/chat/EmptyState';
import { ConversationDrawer } from '../../components/chat/ConversationDrawer';
import { spacing, borderRadius, typography } from '../../theme';

interface ChatScreenProps {
  onOpenSettings: () => void;
  onOpenMemoryVault: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onOpenSettings, onOpenMemoryVault }) => {
  const { colors } = useTheme();
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingText,
    error,
    loadConversations,
    selectConversation,
    newChat,
    sendMessage,
    stopStreaming,
    deleteConversation,
    clearError,
  } = useChatStore();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll when new messages arrive or when streaming tokens update
  useEffect(() => {
    if (messages.length > 0 || streamingText) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages.length, streamingText]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const conversationTitle = activeConversation ? activeConversation.title : 'Orbit';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <Header
        title={conversationTitle}
        onOpenDrawer={() => setDrawerVisible(true)}
        onOpenSettings={onOpenSettings}
        onOpenMemoryVault={onOpenMemoryVault}
        onNewChat={newChat}
      />

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructiveSubtle, borderColor: colors.destructive }]}>
          <View style={styles.errorRow}>
            <AlertCircle size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
          <TouchableOpacity onPress={clearError}>
            <X size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Stream or Empty Starter Screen */}
      <View style={styles.chatArea}>
        {messages.length === 0 && !isStreaming ? (
          <EmptyState onSelectPrompt={(prompt) => sendMessage(prompt)} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => <ChatBubble message={item} />}
            ListFooterComponent={
              isStreaming ? (
                <ChatBubble isStreaming streamingText={streamingText} />
              ) : null
            }
          />
        )}
      </View>

      {/* Bottom Chat Input */}
      <ChatInput
        onSendMessage={(text) => sendMessage(text)}
        onStopStreaming={stopStreaming}
        isStreaming={isStreaming}
      />

      {/* Slide-over Conversation Drawer */}
      <ConversationDrawer
        visible={drawerVisible}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => selectConversation(id)}
        onNewChat={newChat}
        onDeleteConversation={(id) => deleteConversation(id)}
        onClose={() => setDrawerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingVertical: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  errorText: {
    ...typography.caption,
    fontSize: 13,
  },
});
