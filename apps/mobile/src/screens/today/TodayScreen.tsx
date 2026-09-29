// ============================================================================
// Today Dashboard Screen (Orbit Proactive Intelligence Hub)
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, MessageSquare, Sparkles, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useTodayStore } from '../../store/todayStore';
import { MorningBriefCard } from '../../components/today/MorningBriefCard';
import { AgendaTimeline } from '../../components/today/AgendaTimeline';
import { ProactiveNudgeCard } from '../../components/today/ProactiveNudgeCard';
import { SuggestedAction } from '@kairo/shared';

interface TodayScreenProps {
  onOpenChat: (initialPrompt?: string) => void;
  onOpenSettings: () => void;
}

export function TodayScreen({ onOpenChat, onOpenSettings }: TodayScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const {
    morningBrief,
    eveningReview,
    isLoading,
    isGenerating,
    isPlayingAudio,
    loadToday,
    generateBrief,
    togglePlayAudio,
    markRead,
  } = useTodayStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadToday();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadToday();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const activeBrief = morningBrief || eveningReview;
  const suggestedActions = activeBrief?.suggested_actions || [];
  const agendaItems = activeBrief?.agenda_items || [];

  const handleActOnSuggestion = (action: SuggestedAction) => {
    onOpenChat(`Orbit, let's work on: ${action.title}. ${action.description}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top App Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>
          <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Friend'}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => onOpenChat()}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MessageSquare size={18} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenSettings}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {isLoading && !activeBrief ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Synthesizing today's intelligence...
            </Text>
          </View>
        ) : (
          <>
            {/* 1. Morning / Evening AI Brief Card */}
            {activeBrief && (
              <MorningBriefCard
                brief={activeBrief}
                isPlayingAudio={isPlayingAudio}
                isGenerating={isGenerating}
                onToggleAudio={togglePlayAudio}
                onMarkRead={() => markRead(activeBrief.id)}
                onRegenerate={() => generateBrief(activeBrief.type)}
              />
            )}

            {/* 2. Today's Agenda & Timeline */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Agenda</Text>
              <Text style={[styles.sectionBadge, { color: colors.textSecondary }]}>
                {agendaItems.length} {agendaItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <AgendaTimeline items={agendaItems} />

            {/* 3. Proactive AI Recommendations */}
            {suggestedActions.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Orbit Suggestions
                  </Text>
                  <View style={[styles.aiDot, { backgroundColor: colors.accent }]} />
                </View>

                {suggestedActions.map((action) => (
                  <ProactiveNudgeCard
                    key={action.id}
                    action={action}
                    onAct={handleActOnSuggestion}
                  />
                ))}
              </>
            )}

            {/* 4. Quick Contextual Conversation Starter Bar */}
            <TouchableOpacity
              onPress={() => onOpenChat()}
              activeOpacity={0.8}
              style={[
                styles.quickChatBar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Sparkles size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.quickChatText, { color: colors.textSecondary }]}>
                Ask Orbit anything about today...
              </Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 12,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quickChatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  quickChatText: {
    fontSize: 14,
  },
});
