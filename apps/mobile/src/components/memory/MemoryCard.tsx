import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Pin, Trash2, Edit3, Sparkles } from 'lucide-react-native';
import { Memory, MemoryCategory } from '@orbit/shared';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface MemoryCardProps {
  memory: Memory;
  onEdit: (memory: Memory) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const { colors } = useTheme();

  const getCategoryTheme = (category: MemoryCategory) => {
    switch (category) {
      case 'preference':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'goal':
        return { bg: 'rgba(14, 165, 233, 0.12)', text: '#0EA5E9', border: 'rgba(14, 165, 233, 0.3)' };
      case 'project':
        return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)' };
      case 'routine':
        return { bg: 'rgba(20, 184, 166, 0.12)', text: '#14B8A6', border: 'rgba(20, 184, 166, 0.3)' };
      case 'relationship':
        return { bg: 'rgba(236, 72, 153, 0.12)', text: '#EC4899', border: 'rgba(236, 72, 153, 0.3)' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  const catStyle = getCategoryTheme(memory.category);

  const confirmDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want Orbit to forget this fact permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Forget', style: 'destructive', onPress: () => onDelete(memory.id) },
      ]
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: memory.is_pinned ? colors.accent : colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
            <Text style={[styles.categoryText, { color: catStyle.text }]}>
              {memory.category.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.importanceBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Sparkles size={10} color={colors.accent} />
            <Text style={[styles.importanceText, { color: colors.textSecondary }]}>
              {memory.importance_score}/10
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => onTogglePin(memory.id)}
            style={[styles.iconButton, memory.is_pinned && { backgroundColor: colors.accentSubtle }]}
            accessibilityLabel={memory.is_pinned ? 'Unpin memory' : 'Pin memory'}
          >
            <Pin
              size={14}
              color={memory.is_pinned ? colors.accent : colors.textTertiary}
              fill={memory.is_pinned ? colors.accent : 'none'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onEdit(memory)}
            style={styles.iconButton}
            accessibilityLabel="Edit memory"
          >
            <Edit3 size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmDelete}
            style={styles.iconButton}
            accessibilityLabel="Delete memory"
          >
            <Trash2 size={14} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.content, { color: colors.textPrimary }]}>{memory.content}</Text>

      <View style={styles.cardFooter}>
        <Text style={[styles.sourceText, { color: colors.textTertiary }]}>
          Source: {memory.source_type}
        </Text>
        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
          {new Date(memory.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  importanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  importanceText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: spacing.xs,
  },
  sourceText: {
    ...typography.caption,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  timeText: {
    ...typography.caption,
    fontSize: 11,
  },
});
