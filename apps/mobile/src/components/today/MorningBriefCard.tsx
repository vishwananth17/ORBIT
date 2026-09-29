// ============================================================================
// Morning Brief Card Component
// Displays Orbit's synthesized daily brief with audio playback simulation
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Play, Pause, Volume2, Check, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { DailyBrief } from '@kairo/shared';

interface MorningBriefCardProps {
  brief: DailyBrief;
  isPlayingAudio: boolean;
  isGenerating?: boolean;
  onToggleAudio: () => void;
  onMarkRead: () => void;
  onRegenerate: () => void;
}

export function MorningBriefCard({
  brief,
  isPlayingAudio,
  isGenerating = false,
  onToggleAudio,
  onMarkRead,
  onRegenerate,
}: MorningBriefCardProps) {
  const { colors } = useTheme();
  const isRead = !!brief.read_at;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.accent + '33' }]}>
      {/* Top Header Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: colors.accent + '1A' }]}>
          <Sparkles size={12} color={colors.accent} style={{ marginRight: 5 }} />
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            {brief.type === 'evening_review' ? 'ORBIT EVENING REVIEW' : 'ORBIT MORNING BRIEF'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onRegenerate}
            disabled={isGenerating}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.iconButton}
          >
            <RefreshCw size={14} color={isGenerating ? colors.accent : colors.textSecondary} />
          </TouchableOpacity>

          {!isRead && (
            <TouchableOpacity
              onPress={onMarkRead}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.markReadButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Check size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
              <Text style={[styles.markReadText, { color: colors.textSecondary }]}>Mark Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Brief Title */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{brief.title}</Text>

      {/* AI Synthesis Summary */}
      <Text style={[styles.summary, { color: colors.textSecondary }]}>{brief.summary}</Text>

      {/* Audio Brief Player Widget */}
      <TouchableOpacity
        onPress={onToggleAudio}
        activeOpacity={0.8}
        style={[
          styles.audioPlayer,
          {
            backgroundColor: isPlayingAudio ? colors.accent + '15' : colors.surfaceSecondary,
            borderColor: isPlayingAudio ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={[styles.playCircle, { backgroundColor: isPlayingAudio ? colors.accent : colors.surface }]}>
          {isPlayingAudio ? (
            <Pause size={14} color={isPlayingAudio ? '#000000' : colors.textPrimary} />
          ) : (
            <Play size={14} color={colors.textPrimary} style={{ marginLeft: 2 }} />
          )}
        </View>

        <View style={styles.audioContent}>
          <Text style={[styles.audioTitle, { color: colors.textPrimary }]}>
            {isPlayingAudio ? 'Speaking Orbit Brief...' : 'Listen to Orbit Brief'}
          </Text>
          <Text style={[styles.audioSubtitle, { color: colors.textSecondary }]}>
            {isPlayingAudio ? 'Audio synthesized • Tap to pause' : 'Voice recitation ~45s • Tap to play'}
          </Text>
        </View>

        <Volume2 size={18} color={isPlayingAudio ? colors.accent : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audioContent: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  audioSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
