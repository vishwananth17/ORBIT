// ============================================================================
// Proactive Nudge Card Component
// Displays actionable AI recommendations and context-aware suggestions
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lightbulb, ArrowRight, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SuggestedAction } from '@kairo/shared';

interface ProactiveNudgeCardProps {
  action: SuggestedAction;
  onAct: (action: SuggestedAction) => void;
  onDismiss?: (actionId: string) => void;
}

export function ProactiveNudgeCard({ action, onAct, onDismiss }: ProactiveNudgeCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
          <Lightbulb size={16} color={colors.accent} />
        </View>

        <View style={styles.contentArea}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{action.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{action.description}</Text>
        </View>

        {onDismiss && (
          <TouchableOpacity
            onPress={() => onDismiss(action.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.dismissBtn}
          >
            <X size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onAct(action)}
        activeOpacity={0.8}
        style={[styles.actButton, { backgroundColor: colors.surfaceSecondary }]}
      >
        <Text style={[styles.actText, { color: colors.accent }]}>Act with Orbit</Text>
        <ArrowRight size={14} color={colors.accent} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  contentArea: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 6,
  },
  actButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  actText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
