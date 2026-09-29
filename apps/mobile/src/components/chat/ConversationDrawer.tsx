import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Plus, X, Search, MessageSquare, Trash2, Pin } from 'lucide-react-native';
import { Conversation } from '@orbit/shared';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface ConversationDrawerProps {
  visible: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClose: () => void;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  visible,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClose,
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.drawerContainer, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Conversations</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              onPress={() => {
                onNewChat();
                onClose();
              }}
              style={[styles.newChatButton, { backgroundColor: colors.accent }]}
            >
              <Plus size={16} color={colors.accentText} />
              <Text style={[styles.newChatText, { color: colors.accentText }]}>New Conversation</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle }]}>
              <Search size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search conversations..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Conversations List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isActive = item.id === activeConversationId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelectConversation(item.id);
                    onClose();
                  }}
                  style={[
                    styles.conversationItem,
                    {
                      backgroundColor: isActive ? colors.surfaceSecondary : 'transparent',
                      borderColor: isActive ? colors.accent : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    {item.pinned ? (
                      <Pin size={16} color={colors.accent} />
                    ) : (
                      <MessageSquare size={16} color={colors.textTertiary} />
                    )}
                    <View style={styles.textColumn}>
                      <Text
                        style={[
                          styles.conversationTitle,
                          { color: isActive ? colors.textPrimary : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.last_message && (
                        <Text
                          style={[styles.lastMessagePreview, { color: colors.textTertiary }]}
                          numberOfLines={1}
                        >
                          {item.last_message}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => onDeleteConversation(item.id)}
                    style={styles.deleteButton}
                    accessibilityLabel="Delete conversation"
                  >
                    <Trash2 size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  {searchQuery ? 'No matching conversations' : 'No past conversations yet.'}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: '84%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.subheading,
  },
  closeButton: {
    padding: spacing.xs,
  },
  actionSection: {
    padding: spacing.lg,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  newChatText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    padding: 0,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  textColumn: {
    flex: 1,
  },
  conversationTitle: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  lastMessagePreview: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    fontSize: 13,
  },
});
