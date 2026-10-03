import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Mail, Calendar, Trash2, Check, X, ShieldAlert, Sparkles } from 'lucide-react-native';
import { TOOL_NAMES } from '@orbit/shared';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

export interface ActionConfirmationItem {
  actionId: string;
  toolName: string;
  description: string;
  actionPayload: Record<string, unknown>;
  status: 'pending' | 'executed' | 'rejected';
  result?: unknown;
}

interface ToolConfirmationCardProps {
  action: ActionConfirmationItem;
  onConfirm: (actionId: string) => Promise<void>;
  onReject: (actionId: string) => Promise<void>;
}

export const ToolConfirmationCard: React.FC<ToolConfirmationCardProps> = ({
  action,
  onConfirm,
  onReject,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const getToolIcon = () => {
    switch (action.toolName) {
      case TOOL_NAMES.SEND_EMAIL:
        return <Mail size={16} color={colors.accent} />;
      case TOOL_NAMES.CREATE_CALENDAR_EVENT:
      case TOOL_NAMES.DELETE_CALENDAR_EVENT:
        return <Calendar size={16} color={colors.textSecondary} />;
      case TOOL_NAMES.DELETE_MEMORY:
        return <Trash2 size={16} color={colors.destructive} />;
      default:
        return <Sparkles size={16} color={colors.accent} />;
    }
  };

  const handleApprove = async () => {
    if (loading || action.status !== 'pending') return;
    setLoading(true);
    await onConfirm(action.actionId);
    setLoading(false);
  };

  const handleReject = async () => {
    if (loading || action.status !== 'pending') return;
    setLoading(true);
    await onReject(action.actionId);
    setLoading(false);
  };

  const payload = action.actionPayload;

  return (
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: action.status === 'pending' ? colors.warning : colors.borderSubtle,
          },
        ]}
      >
        {/* Header Badge */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
              {getToolIcon()}
            </View>
            <View>
              <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>
                {(action.toolName || '').replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                Consequential Write Action
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  action.status === 'pending'
                    ? colors.surfaceSecondary
                    : action.status === 'executed'
                    ? colors.surfaceSecondary
                    : colors.destructiveSubtle,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    action.status === 'pending'
                      ? colors.warning
                      : action.status === 'executed'
                      ? colors.accent
                      : colors.destructive,
                },
              ]}
            >
              {(action.status || '').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Action Details Box */}
        <View style={[styles.detailsBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle }]}>
          {action.toolName === TOOL_NAMES.SEND_EMAIL && (
            <>
              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>Recipient:</Text>
                <Text style={[styles.paramValue, { color: colors.textPrimary }]}>{String(payload.to || '')}</Text>
              </View>
              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>Subject:</Text>
                <Text style={[styles.paramValue, { color: colors.textPrimary }]}>{String(payload.subject || '')}</Text>
              </View>
              {Array.isArray(payload.cc) && payload.cc.length > 0 && (
                <View style={styles.paramRow}><Text style={[styles.paramLabel, { color: colors.textSecondary }]}>CC:</Text>
                <Text style={[styles.paramValue, { color: colors.textPrimary }]}>{payload.cc.join(', ')}</Text></View>
              )}
              <View style={[styles.paramRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>Message:</Text>
                <Text style={[styles.paramValue, { color: colors.textPrimary }]}>
                  {String(payload.body || '')}
                </Text>
              </View>
            </>
          )}

          {action.toolName === TOOL_NAMES.CREATE_CALENDAR_EVENT && (
            <>
              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>Event:</Text>
                <Text style={[styles.paramValue, { color: colors.textPrimary }]}>{String(payload.summary || '')}</Text>
              </View>
              <View style={[styles.paramRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>Schedule:</Text>
                <Text style={[styles.paramValue, { color: colors.textPrimary }]}>
                  {String(payload.start_time || '')}
                </Text>
              </View>
            </>
          )}

          {!['send_email', 'create_calendar_event'].includes(action.toolName) && (
            <Text style={[styles.paramValue, { color: colors.textPrimary }]}>{action.description}</Text>
          )}
        </View>

        {/* Buttons (Active when pending) */}
        {action.status === 'pending' ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleReject}
              disabled={loading}
              style={[styles.rejectButton, { borderColor: colors.borderSubtle }]}
              accessibilityLabel="Reject action"
            >
              <X size={16} color={colors.destructive} />
              <Text style={[styles.rejectText, { color: colors.destructive }]}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApprove}
              disabled={loading}
              style={[styles.confirmButton, { backgroundColor: colors.accent }]}
              accessibilityLabel="Confirm & Execute"
            >
              {loading ? (
                <ActivityIndicator color={colors.accentText} size="small" />
              ) : (
                <>
                  <Check size={16} color={colors.accentText} />
                  <Text style={[styles.confirmText, { color: colors.accentText }]}>Confirm & Execute</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.receiptRow}>
            <ShieldAlert size={14} color={action.status === 'executed' ? colors.accent : colors.destructive} />
            <Text style={[styles.receiptText, { color: colors.textTertiary }]}>
              {action.status === 'executed'
                ? 'Action executed successfully via verified user sign-off.'
                : 'Action was cancelled by user request.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  detailsBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  paramRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  paramLabel: {
    width: 80,
    ...typography.caption,
    fontWeight: '600',
  },
  paramValue: {
    flex: 1,
    ...typography.caption,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rejectButton: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  rejectText: {
    ...typography.caption,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 2,
    height: 40,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmText: {
    ...typography.caption,
    fontWeight: '700',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 2,
  },
  receiptText: {
    ...typography.caption,
    fontSize: 11,
  },
});
