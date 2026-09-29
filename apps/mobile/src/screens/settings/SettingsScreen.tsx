import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  Fingerprint,
  Vibrate,
  Clock,
  Download,
  LogOut,
  Trash2,
  Shield,
  Link2,
  Bot,
  BookOpen,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';
import { apiClient } from '../../api/client';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenIntegrations: () => void;
  onOpenNotifications: () => void;
  onOpenAgents?: () => void;
  onOpenJournal?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenIntegrations,
  onOpenNotifications,
  onOpenAgents,
  onOpenJournal,
}) => {
  const { colors, mode, setMode } = useTheme();
  const { user, logout, token } = useAuthStore();
  const {
    biometricsEnabled,
    hapticsEnabled,
    notificationSettings,
    setBiometricsEnabled,
    setHapticsEnabled,
  } = useSettingsStore();

  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await apiClient.exportData(token);
      Alert.alert(
        'Data Export Complete',
        `Your complete conversation history, memories, and task logs have been prepared.\n\nExport records: ${JSON.stringify(
          Object.keys(data)
        )}`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Memories',
      'Are you sure? This will permanently erase your profile, all memories from pgvector, and all conversation logs. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteAccount(token);
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSubtle }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'O'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {user?.full_name || 'Orbit User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {user?.email || 'user@orbit.ai'}
            </Text>
          </View>
        </View>

        {/* Section: Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.themeSelector}>
            {[
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'system', label: 'System', icon: Smartphone },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = mode === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setMode(item.id as any)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Icon size={18} color={isSelected ? colors.accent : colors.textSecondary} />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Security & Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>SECURITY & HAPTICS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Fingerprint size={18} color={colors.accent} />
              <View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Biometric Lock</Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  Require FaceID/TouchID on app launch
                </Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: colors.surfaceSecondary, true: colors.accent }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Vibrate size={18} color={colors.accent} />
              <View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Haptic Feedback</Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  Tactile feedback when streaming and sending
                </Text>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: colors.surfaceSecondary, true: colors.accent }}
            />
          </View>
        </View>

        {/* Section: Proactive Quiet Hours */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PROACTIVITY & QUIET HOURS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={onOpenNotifications} style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Clock size={18} color={colors.accent} />
              <View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Quiet Hours & Daily Briefs</Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  Schedule morning brief, evening review & quiet hours
                </Text>
              </View>
            </View>
            <Text style={[styles.badgeValue, { color: colors.accent }]}>Configure →</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Personas & Custom Agents (Phase 6) */}
        {onOpenAgents && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PERSONAS & AGENTS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <TouchableOpacity onPress={onOpenAgents} style={styles.rowItem}>
                <View style={styles.rowLabelGroup}>
                  <Bot size={18} color={colors.accent} />
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Custom Personas & Agents</Text>
                    <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                      Chief of Staff, Deep Work Sentinel, Research Mentor & custom prompts
                    </Text>
                  </View>
                </View>
                <Text style={[styles.badgeValue, { color: colors.accent }]}>Manage →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Section: Daily Reflection & Insights (Phase 7) */}
        {onOpenJournal && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DAILY REFLECTION & INSIGHTS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <TouchableOpacity onPress={onOpenJournal} style={styles.rowItem}>
                <View style={styles.rowLabelGroup}>
                  <BookOpen size={18} color="#8B5CF6" />
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Mindful Reflection & Mood</Text>
                    <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                      Daily pause log, mood & energy trends, and weekly AI synthesis
                    </Text>
                  </View>
                </View>
                <Text style={[styles.badgeValue, { color: colors.accent }]}>View →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Section: Connected Tools */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>EXTERNAL TOOLS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={onOpenIntegrations} style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Link2 size={18} color={colors.accent} />
              <View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Connected Integrations</Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  Google Calendar, Gmail, and Drive OAuth settings
                </Text>
              </View>
            </View>
            <Text style={[styles.badgeValue, { color: colors.accent }]}>Manage →</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Privacy & Data Sovereignty */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PRIVACY & DATA SOVEREIGNTY</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity
            onPress={handleExportData}
            disabled={isExporting}
            style={styles.actionRow}
          >
            <View style={styles.rowLabelGroup}>
              <Download size={18} color={colors.textPrimary} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                {isExporting ? 'Exporting...' : 'Export All Data (JSON)'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity onPress={logout} style={styles.actionRow}>
            <View style={styles.rowLabelGroup}>
              <LogOut size={18} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity onPress={handleDeleteAccount} style={styles.actionRow}>
            <View style={styles.rowLabelGroup}>
              <Trash2 size={18} color={colors.destructive} />
              <Text style={[styles.actionText, { color: colors.destructive }]}>
                Delete Account & Purge Memories
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.subheading,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.heading,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    ...typography.bodyBold,
  },
  profileEmail: {
    ...typography.caption,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  themeLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTitle: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  rowDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  badgeValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  actionRow: {
    paddingVertical: spacing.xs,
  },
  actionText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
});
