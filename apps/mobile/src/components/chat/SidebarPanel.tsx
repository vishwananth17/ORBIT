import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet } from 'react-native';
import { SquarePen, Search, X, Trash2, Sparkles } from 'lucide-react-native';
import { Conversation } from '@orbit/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { spacing, borderRadius, typography } from '../../theme';

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  active?: boolean;
}

interface SidebarPanelProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  navItems?: SidebarNavItem[];
  onClose?: () => void;
}

export const SidebarPanel: React.FC<SidebarPanelProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  navItems = [],
  onClose,
}) => {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user) as any;
  const [query, setQuery] = useState('');
  const done = () => onClose && onClose();

  const filtered = (conversations || []).filter((c) =>
    (c?.title || 'Untitled')
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <Sparkles size={16} color={colors.textPrimary} strokeWidth={1.5} />
          <Text style={[styles.brandText, { color: colors.textPrimary }]}>Orbit</Text>
        </View>
        {onClose ? (
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu" style={styles.iconBtn}>
            <X size={18} color={colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => {
          onNewChat();
          done();
        }}
        style={[styles.newChat, { borderColor: colors.border }]}
        accessibilityLabel="New chat"
      >
        <SquarePen size={16} color={colors.textPrimary} strokeWidth={1.5} />
        <Text style={[styles.newChatText, { color: colors.textPrimary }]}>New chat</Text>
      </TouchableOpacity>

      <View style={[styles.search, { backgroundColor: colors.surfaceSecondary }]}>
        <Search size={14} color={colors.textTertiary} strokeWidth={1.5} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search chats"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <Text style={[styles.section, { color: colors.textTertiary }]}>Recent</Text>
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const active = item.id === activeConversationId;
          return (
            <TouchableOpacity
              onPress={() => {
                onSelectConversation(item.id);
                done();
              }}
              style={[styles.row, { backgroundColor: active ? colors.surfaceHover : 'transparent' }]}
            >
              <Text
                numberOfLines={1}
                style={[styles.rowText, { color: active ? colors.textPrimary : colors.textSecondary }]}
              >
                {item.title || 'Untitled'}
              </Text>
              <TouchableOpacity onPress={() => onDeleteConversation(item.id)} accessibilityLabel="Delete chat" style={styles.iconBtn}>
                <Trash2 size={14} color={colors.textTertiary} strokeWidth={1.5} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            {query ? 'No matching chats' : 'No chats yet. Start one above.'}
          </Text>
        }
      />

      <View style={[styles.nav, { borderTopColor: colors.border }]}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                item.onPress();
                done();
              }}
              style={[styles.row, { backgroundColor: item.active ? colors.surfaceHover : 'transparent' }]}
            >
              <View style={styles.navLeft}>
                <Icon size={16} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.rowText, { color: colors.textPrimary }]}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {user?.email ? (
          <Text numberOfLines={1} style={[styles.user, { color: colors.textTertiary }]}>
            {user.email}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { flex: 1, width: '100%', borderRightWidth: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, marginBottom: spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { ...typography.subheading },
  iconBtn: { padding: spacing.xs },
  newChat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.lg, paddingVertical: 10, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  newChatText: { ...typography.label, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.md },
  searchInput: { flex: 1, padding: 0, fontSize: 14 },
  section: { ...typography.caption, fontWeight: '600', paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md },
  rowText: { ...typography.label, fontSize: 14, flexShrink: 1 },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nav: { borderTopWidth: 1, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: 2 },
  user: { ...typography.caption, paddingHorizontal: spacing.sm, paddingTop: spacing.md },
  empty: { ...typography.caption, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
});
