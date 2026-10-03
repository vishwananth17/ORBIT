// ============================================================================
// Notification & Quiet Hours Settings Screen
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Moon, Sun, Bell, Clock, ShieldCheck, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useTodayStore } from '../../store/todayStore';
import { apiClient } from '../../api/client';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

const MORNING_PRESETS = ['07:00:00', '07:30:00', '08:00:00', '08:30:00', '09:00:00'];
const EVENING_PRESETS = ['19:30:00', '20:00:00', '20:30:00', '21:00:00', '22:00:00'];
const QUIET_START_PRESETS = ['21:00:00', '21:30:00', '22:00:00', '22:30:00', '23:00:00'];
const QUIET_END_PRESETS = ['06:30:00', '07:00:00', '07:30:00', '08:00:00', '08:30:00'];

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, loadSettings, updateSettings } = useTodayStore();

  const [morningTime, setMorningTime] = useState('08:00:00');
  const [eveningTime, setEveningTime] = useState('20:30:00');
  const [quietStart, setQuietStart] = useState('22:00:00');
  const [quietEnd, setQuietEnd] = useState('07:30:00');
  const [nudgesEnabled, setNudgesEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setMorningTime(settings.morning_brief_time || '08:00:00');
      setEveningTime(settings.evening_review_time || '20:30:00');
      setQuietStart(settings.quiet_hours_start || '22:00:00');
      setQuietEnd(settings.quiet_hours_end || '07:30:00');
      setNudgesEnabled(settings.proactive_nudges_enabled);
      setRemindersEnabled(settings.smart_reminders_enabled);
    }
  }, [settings]);

  const formatDisplayTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
  };

  const handleSave = async (overrides: Partial<any> = {}) => {
    setIsSaving(true);
    try {
      await updateSettings({
        morning_brief_time: overrides.morningTime ?? morningTime,
        evening_review_time: overrides.eveningTime ?? eveningTime,
        quiet_hours_start: overrides.quietStart ?? quietStart,
        quiet_hours_end: overrides.quietEnd ?? quietEnd,
        proactive_nudges_enabled: overrides.nudgesEnabled ?? nudgesEnabled,
        smart_reminders_enabled: overrides.remindersEnabled ?? remindersEnabled,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPush = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await apiClient.testPushNotification();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTestStatus(res.success ? 'Notification signal sent!' : 'Push token not yet registered on device.');
    } catch (err: any) {
      setTestStatus(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications & Quiet Hours</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Quiet Hours Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Moon size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Quiet Hours Protocol</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Orbit completely silences notifications during these hours. Urgent alerts only.
          </Text>

          {/* Quiet Start */}
          <Text style={[styles.presetLabel, { color: colors.textPrimary }]}>Quiet Hours Begin</Text>
          <View style={styles.presetRow}>
            {QUIET_START_PRESETS.map((p) => {
              const selected = quietStart === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    setQuietStart(p);
                    handleSave({ quietStart: p });
                  }}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: selected ? colors.accent : colors.surfaceSecondary,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.presetText, { color: selected ? colors.accentText : colors.textPrimary }]}>
                    {formatDisplayTime(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quiet End */}
          <Text style={[styles.presetLabel, { color: colors.textPrimary, marginTop: 14 }]}>
            Quiet Hours End
          </Text>
          <View style={styles.presetRow}>
            {QUIET_END_PRESETS.map((p) => {
              const selected = quietEnd === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    setQuietEnd(p);
                    handleSave({ quietEnd: p });
                  }}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: selected ? colors.accent : colors.surfaceSecondary,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.presetText, { color: selected ? colors.accentText : colors.textPrimary }]}>
                    {formatDisplayTime(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Morning Brief Time */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Sun size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Morning Brief Delivery</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            When Orbit generates and prepares your daily priorities & schedule overview.
          </Text>

          <View style={styles.presetRow}>
            {MORNING_PRESETS.map((p) => {
              const selected = morningTime === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    setMorningTime(p);
                    handleSave({ morningTime: p });
                  }}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: selected ? colors.accent : colors.surfaceSecondary,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.presetText, { color: selected ? colors.accentText : colors.textPrimary }]}>
                    {formatDisplayTime(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Evening Review Time */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Clock size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Evening Review Delivery</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            When Orbit initiates your end-of-day checklist and reflection prompt.
          </Text>

          <View style={styles.presetRow}>
            {EVENING_PRESETS.map((p) => {
              const selected = eveningTime === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    setEveningTime(p);
                    handleSave({ eveningTime: p });
                  }}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: selected ? colors.accent : colors.surfaceSecondary,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.presetText, { color: selected ? colors.accentText : colors.textPrimary }]}>
                    {formatDisplayTime(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Feature Toggles */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Proactive Suggestions</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                Allow Orbit to suggest relevant actions, prep notes, and draft emails.
              </Text>
            </View>
            <Switch
              value={nudgesEnabled}
              onValueChange={(val) => {
                setNudgesEnabled(val);
                handleSave({ nudgesEnabled: val });
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Smart Task Reminders</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                Receive punctual alerts when tasks or calendar items are approaching.
              </Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={(val) => {
                setRemindersEnabled(val);
                handleSave({ remindersEnabled: val });
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        </View>

        {/* 5. Push Notification Diagnostics */}
        <TouchableOpacity
          onPress={handleTestPush}
          disabled={isTesting}
          style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Bell size={16} color={colors.accent} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.testButtonText, { color: colors.textPrimary }]}>
            Send Test Push Notification
          </Text>
        </TouchableOpacity>

        {testStatus && (
          <Text style={[styles.testStatusText, { color: colors.accent }]}>{testStatus}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  testStatusText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});
