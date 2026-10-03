// ============================================================================
// Agenda Timeline Component
// Interactive display of today's schedule, calendar events, and tasks
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AgendaItem } from '@orbit/shared';

interface AgendaTimelineProps {
  items: AgendaItem[];
  onToggleTask?: (itemId: string) => void;
}

export function AgendaTimeline({ items, onToggleTask }: AgendaTimelineProps) {
  const { colors } = useTheme();

  if (!items || items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Calendar size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scheduled events or tasks</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Your agenda is clear today. Orbit will notify you if anything comes up.
        </Text>
      </View>
    );
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return colors.destructive;
      case 'high':
        return colors.textSecondary;
      case 'medium':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isTask = item.type === 'task';
        const isCompleted = item.completed || item.status === 'completed';
        const priorityColor = getPriorityColor(item.priority);

        return (
          <View key={item.id || `item-${index}`} style={styles.itemRow}>
            {/* Timeline Left Rail */}
            <View style={styles.railContainer}>
              <View
                style={[
                  styles.nodeCircle,
                  {
                    borderColor: isCompleted ? colors.accent : priorityColor,
                    backgroundColor: isCompleted ? colors.accent : colors.surface,
                  },
                ]}
              >
                {isCompleted ? (
                  <CheckCircle2 size={12} color={colors.accentText} />
                ) : (
                  <View style={[styles.innerDot, { backgroundColor: priorityColor }]} />
                )}
              </View>
              {!isLast && <View style={[styles.railLine, { backgroundColor: colors.border }]} />}
            </View>

            {/* Timeline Item Content Card */}
            <TouchableOpacity
              activeOpacity={isTask ? 0.7 : 1}
              onPress={() => isTask && onToggleTask && onToggleTask(item.id)}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isCompleted ? colors.border : colors.border,
                  opacity: isCompleted ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.metaRow}>
                  {item.time ? (
                    <View style={styles.timeBadge}>
                      <Clock size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.time}</Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: isTask ? colors.accent + '15' : '#3B82F615',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: isTask ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {isTask ? 'TASK' : 'EVENT'}
                    </Text>
                  </View>

                  {item.priority && item.priority !== 'medium' && (
                    <View style={[styles.priorityBadge, { borderColor: priorityColor + '40' }]}>
                      <Text style={[styles.priorityText, { color: priorityColor }]}>
                        {item.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {isTask && (
                  <View style={styles.checkboxArea}>
                    {isCompleted ? (
                      <CheckCircle2 size={18} color={colors.accent} />
                    ) : (
                      <Circle size={18} color={colors.textSecondary} />
                    )}
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: colors.textPrimary,
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
                  },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  railContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
    paddingTop: 8,
  },
  nodeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  railLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  itemCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  checkboxArea: {
    marginLeft: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyContainer: {
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
