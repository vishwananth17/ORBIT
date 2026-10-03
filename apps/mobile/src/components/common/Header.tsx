import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, Settings, Plus, Sparkles, Brain, Sun, Bot, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAgentStore } from '../../store/agentStore';
import { spacing, borderRadius, typography } from '../../theme';

interface HeaderProps {
  title?: string;
  onOpenDrawer: () => void;
  onOpenSettings?: () => void;
  onOpenMemoryVault?: () => void;
  onOpenToday?: () => void;
  onOpenAgents?: () => void;
  onOpenJournal?: () => void;
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Orbit',
  onOpenDrawer,
  onOpenSettings,
  onOpenMemoryVault,
  onOpenToday,
  onOpenAgents,
  onOpenJournal,
  onNewChat,
}) => {
  const { colors } = useTheme();
  const { activeAgent } = useAgentStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.borderSubtle }]}>
      <View style={styles.leftRow}>
        <TouchableOpacity
          onPress={onOpenDrawer}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          accessibilityLabel="Open conversation history"
        >
          <Menu size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <View style={styles.brandRow}>
            <Sparkles size={14} color={colors.accent} />
            <Text style={[styles.brandText, { color: colors.textPrimary }]}>
              {title}
            </Text>
          </View>
          {activeAgent && (
            <Text style={[styles.agentSubText, { color: colors.textSecondary }]} numberOfLines={1}>
              {activeAgent.name}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightRow}>
        {onOpenAgents && (
          <TouchableOpacity
            onPress={onOpenAgents}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            accessibilityLabel="Switch Personas & Custom Agents"
          >
            <Bot size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {onOpenToday && (
          <TouchableOpacity
            onPress={onOpenToday}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            accessibilityLabel="Open Today's Brief"
          >
            <Sun size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {onOpenMemoryVault && (
        <TouchableOpacity
          onPress={onOpenMemoryVault}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          accessibilityLabel="Open Memory Vault"
        >
          <Brain size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onNewChat}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          accessibilityLabel="Start new chat"
        >
          <Plus size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {onOpenSettings && (
        <TouchableOpacity
          onPress={onOpenSettings}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          accessibilityLabel="Settings"
        >
          <Settings size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandText: {
    ...typography.subheading,
    fontWeight: '700',
  },
  agentSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});
