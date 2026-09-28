import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, Calendar, CheckSquare, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  const { colors } = useTheme();

  const suggestions = [
    {
      icon: Calendar,
      title: 'Plan my daily priorities',
      subtitle: 'Schedule deep work blocks & meetings',
      prompt: 'Plan my daily priorities and schedule deep work blocks today.',
    },
    {
      icon: CheckSquare,
      title: 'Draft a concise email update',
      subtitle: 'Prepare summary for team alignment',
      prompt: 'Help me draft a concise update email about my current project progress.',
    },
    {
      icon: Sparkles,
      title: 'Recall my preferences',
      subtitle: 'Check remembered facts & habits',
      prompt: 'What preferences and working habits have you remembered about me so far?',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <View style={[styles.logoBadge, { backgroundColor: colors.accentSubtle }]}>
          <Sparkles size={24} color={colors.accent} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Where shall we focus?
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          Orbit learns your workflow, protects your privacy, and requires confirmation for consequential actions.
        </Text>
      </View>

      <View style={styles.suggestionsList}>
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelectPrompt(item.prompt)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              accessibilityLabel={item.title}
            >
              <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Icon size={16} color={colors.accent} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.privacyBadgeRow}>
        <ShieldCheck size={12} color={colors.textTertiary} />
        <Text style={[styles.privacyBadgeText, { color: colors.textTertiary }]}>
          End-to-end encrypted storage with pgvector RLS isolation
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.heading,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  suggestionsList: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  cardSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  privacyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  privacyBadgeText: {
    ...typography.caption,
    fontSize: 11,
  },
});
