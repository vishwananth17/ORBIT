import { LineIcon } from '../../components/common/LineIcon';
import { X, Sparkles, Check, Star } from 'lucide-react-native';
// ============================================================================
// Daily Journal & Insights Analytics Screen (Phase 7)
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useJournalStore } from '../../store/journalStore';

interface Props {
  onBack: () => void;
  onOpenChatWithReflection?: (reflectionText: string) => void;
}

const MOODS = [
  { score: 1, icon: 'moon', label: 'Drained' },
  { score: 2, icon: 'rain', label: 'Tense' },
  { score: 3, icon: 'scale', label: 'Balanced' },
  { score: 4, icon: 'leaf', label: 'Energized' },
  { score: 5, icon: 'rocket', label: 'Peak Flow' },
];

const PRESET_TAGS = [
  'Deep Work',
  'Coding',
  'Meetings',
  'Breakthrough',
  'Gym & Health',
  'Reading',
  'Family',
  'Rest & Recovery',
];

export function JournalScreen({ onBack, onOpenChatWithReflection }: Props) {
  const { colors } = useTheme();
  const {
    todayEntry,
    history,
    analytics,
    isLoading,
    isSaving,
    loadTodayJournal,
    saveJournal,
    loadHistory,
    loadAnalytics,
  } = useJournalStore();

  const [activeTab, setActiveTab] = useState<'reflect' | 'analytics'>('reflect');
  const [selectedDays, setSelectedDays] = useState(7);

  // Form state
  const [moodScore, setMoodScore] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [productivityScore, setProductivityScore] = useState(3);
  const [summary, setSummary] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [takeaways, setTakeaways] = useState<string[]>([]);

  useEffect(() => {
    loadTodayJournal();
    loadHistory(14);
    loadAnalytics(selectedDays);
  }, []);

  useEffect(() => {
    if (todayEntry) {
      setMoodScore(todayEntry.mood_score || 3);
      setEnergyLevel(todayEntry.energy_level || 3);
      setProductivityScore(todayEntry.productivity_score || 3);
      setSummary(todayEntry.summary || '');
      setSelectedTags(todayEntry.mood_tags || []);
      setTakeaways(todayEntry.key_takeaways || []);
    }
  }, [todayEntry]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addTakeaway = () => {
    if (keyTakeaway.trim()) {
      setTakeaways([...takeaways, keyTakeaway.trim()]);
      setKeyTakeaway('');
    }
  };

  const removeTakeaway = (index: number) => {
    setTakeaways(takeaways.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!summary.trim() || summary.trim().length < 3) {
      Alert.alert('Required', 'Please write a brief summary of your day.');
      return;
    }

    try {
      await saveJournal({
        summary: summary.trim(),
        mood_score: moodScore,
        energy_level: energyLevel,
        productivity_score: productivityScore,
        mood_tags: selectedTags,
        key_takeaways: takeaways,
        request_ai_reflection: true,
      });
      loadAnalytics(selectedDays);
      Alert.alert('Reflected & Saved', 'Orbit analyzed your entry and synthesized your mindful reflection.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save reflection');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Daily Reflection & Mood</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'reflect' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('reflect')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'reflect' ? colors.accent : colors.textSecondary }]}>
            Today's Reflection
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'analytics' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => {
            setActiveTab('analytics');
            loadAnalytics(selectedDays);
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'analytics' ? colors.accent : colors.textSecondary }]}>
            Trends & Insights
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'reflect' ? (
          <>
            {/* Mood Selector */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>HOW ARE YOU FEELING TODAY?</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m) => {
                const isSelected = moodScore === m.score;
                return (
                  <TouchableOpacity
                    key={m.score}
                    style={[
                      styles.moodBtn,
                      {
                        backgroundColor: isSelected ? colors.accent + '20' : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setMoodScore(m.score)}
                  >
                    <LineIcon name={m.icon} color={isSelected ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.moodLabel, { color: isSelected ? colors.accent : colors.textSecondary }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Energy & Productivity Matrix */}
            <View style={styles.matrixRow}>
              <View style={[styles.matrixCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.matrixLabel, { color: colors.textSecondary }]}>ENERGY</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.ratingCircle,
                        {
                          backgroundColor: energyLevel >= lvl ? '#F59E0B' : colors.border,
                        },
                      ]}
                      onPress={() => setEnergyLevel(lvl)}
                    >
                      <Text style={styles.ratingText}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.matrixCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.matrixLabel, { color: colors.textSecondary }]}>PRODUCTIVITY</Text>
                  <Star size={12} color={colors.textSecondary} strokeWidth={1.5} />
                </View>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.ratingCircle,
                        {
                          backgroundColor: productivityScore >= lvl ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => setProductivityScore(lvl)}
                    >
                      <Text style={styles.ratingText}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Tags */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>KEY THEMES & ACTIVITIES</Text>
            <View style={styles.tagsRow}>
              {PRESET_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: active ? colors.accent + '25' : colors.surface,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {active ? <Check size={13} color={colors.accent} strokeWidth={1.75} /> : null}
                      <Text style={[styles.tagChipText, { color: active ? colors.accent : colors.textSecondary }]}>{tag}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reflection Text Input */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TODAY'S PAUSE & REFLECTION</Text>
            <TextInput
              style={[
                styles.summaryInput,
                { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
              ]}
              multiline
              numberOfLines={4}
              placeholder="What challenged you today? What brought flow? What will you do differently tomorrow?"
              placeholderTextColor={colors.textSecondary}
              value={summary}
              onChangeText={setSummary}
            />

            {/* Key Takeaways */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>KEY TAKEAWAYS & LESSONS</Text>
            <View style={styles.takeawayInputRow}>
              <TextInput
                style={[
                  styles.takeawayInput,
                  { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
                ]}
                placeholder="Add a bullet lesson or win..."
                placeholderTextColor={colors.textSecondary}
                value={keyTakeaway}
                onChangeText={setKeyTakeaway}
                onSubmitEditing={addTakeaway}
              />
              <TouchableOpacity
                style={[styles.addTakeawayBtn, { backgroundColor: colors.accent }]}
                onPress={addTakeaway}
              >
                <Text style={styles.addTakeawayText}>Add</Text>
              </TouchableOpacity>
            </View>

            {takeaways.map((item, idx) => (
              <View key={idx} style={[styles.takeawayItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.takeawayBullet, { color: colors.accent }]}>•</Text>
                <Text style={[styles.takeawayText, { color: colors.textPrimary }]}>{item}</Text>
                <TouchableOpacity onPress={() => removeTakeaway(idx)}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save & Reflect with Orbit AI</Text>
              )}
            </TouchableOpacity>

            {/* AI Mindful Reflection Card */}
            {todayEntry?.ai_reflection && (
              <View
                style={[
                  styles.aiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.accent,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.aiCardHeader}>
                  <Sparkles size={20} color={colors.accent} strokeWidth={1.6} />
                  <Text style={[styles.aiCardTitle, { color: colors.accent }]}>Orbit Mindful Reflection</Text>
                </View>
                <Text style={[styles.aiReflectionText, { color: colors.textPrimary }]}>
                  {todayEntry.ai_reflection}
                </Text>

                {onOpenChatWithReflection && (
                  <TouchableOpacity
                    style={[styles.discussBtn, { borderColor: colors.accent }]}
                    onPress={() => onOpenChatWithReflection(todayEntry.ai_reflection!)}
                  >
                    <Text style={[styles.discussText, { color: colors.accent }]}>Discuss with Orbit Agent</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        ) : (
          /* Trends & Analytics Tab */
          <>
            {/* Days Selector */}
            <View style={styles.periodRow}>
              {[7, 14, 30].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.periodBtn,
                    {
                      backgroundColor: selectedDays === d ? colors.accent : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDays(d);
                    loadAnalytics(d);
                  }}
                >
                  <Text
                    style={[
                      styles.periodText,
                      { color: selectedDays === d ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    Last {d} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoading && !analytics ? (
              <ActivityIndicator style={{ marginVertical: 32 }} color={colors.accent} />
            ) : analytics ? (
              <>
                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricVal, { color: colors.accent }]}>
                      {analytics.average_mood ? `${analytics.average_mood} / 5` : '—'}
                    </Text>
                    <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>Average Mood</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                      {analytics.average_energy ? `${analytics.average_energy} / 5` : '—'}
                    </Text>
                    <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>Average Energy</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricVal, { color: '#10B981' }]}>
                      {analytics.average_productivity ? `${analytics.average_productivity} / 5` : '—'}
                    </Text>
                    <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>Productivity</Text>
                  </View>
                </View>

                {/* AI Synthesis Summary Card */}
                <View style={[styles.synthesisCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.synthesisTitle, { color: colors.accent }]}>Orbit Weekly Synthesis</Text>
                  <Text style={[styles.synthesisBody, { color: colors.textPrimary }]}>
                    {analytics.ai_synthesis}
                  </Text>
                </View>

                {/* Top Tags */}
                {analytics.top_tags && analytics.top_tags.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DOMINANT FOCUS AREAS</Text>
                    <View style={styles.tagsRow}>
                      {analytics.top_tags.map((t) => (
                        <View
                          key={t.tag}
                          style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                          <Text style={[styles.tagChipText, { color: colors.textPrimary }]}>
                            {t.tag} ({t.count})
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Past Reflections List */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 24 }]}>
                  PAST ENTRIES ({history.length})
                </Text>
                {history.map((entry) => (
                  <View
                    key={entry.id}
                    style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                        {entry.entry_date}
                      </Text>
                      <Text style={styles.historyMood}>
                        {entry.mood_score}/5
                      </Text>
                    </View>
                    <Text style={[styles.historySummary, { color: colors.textSecondary }]} numberOfLines={3}>
                      {entry.summary}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
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
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  matrixRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  matrixCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  matrixLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryInput: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  takeawayInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  takeawayInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addTakeawayBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTakeawayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  takeawayBullet: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '700',
  },
  takeawayText: {
    flex: 1,
    fontSize: 13,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  aiCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiSparkle: {
    fontSize: 18,
    marginRight: 6,
  },
  aiCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiReflectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  discussBtn: {
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  discussText: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 11,
  },
  synthesisCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  synthesisTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  synthesisBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  historyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyMood: {
    fontSize: 13,
    fontWeight: '600',
  },
  historySummary: {
    fontSize: 13,
    lineHeight: 18,
  },
});
