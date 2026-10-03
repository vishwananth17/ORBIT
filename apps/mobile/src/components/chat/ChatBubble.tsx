import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Copy, Check } from 'lucide-react-native';
import { Message } from '@orbit/shared';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';
import { StreamingCursor } from './StreamingCursor';

interface ChatBubbleProps {
  message?: Message;
  isStreaming?: boolean;
  streamingText?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isStreaming = false,
  streamingText = '',
}) => {
  const { colors } = useTheme();
  const [copied, setCopied] = React.useState(false);

  const isUser = message?.role === 'user';
  const content = isStreaming ? streamingText : message?.content || '';

  const handleCopy = () => {
    // In React Native: Clipboard.setStringAsync(content)
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={[styles.userBubble, { backgroundColor: colors.userBubble }]}>
          <Text style={[styles.userText, { color: colors.textPrimary }]}>
            {content}
          </Text>
        </View>
      </View>
    );
  }

  // Assistant Bubble
  return (
    <View style={styles.assistantContainer}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}>
          <Sparkles size={12} color={colors.textPrimary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.senderName, { color: colors.textSecondary }]}>Orbit</Text>
        
        {!isStreaming && content.length > 0 && (
          <TouchableOpacity onPress={handleCopy} style={styles.copyButton} accessibilityLabel="Copy message">
            {copied ? (
              <Check size={12} color={colors.accent} />
            ) : (
              <Copy size={12} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.assistantBubble}>
        <Text style={[styles.assistantText, { color: colors.textPrimary }]}>
          {content}
          {isStreaming && <StreamingCursor />}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userContainer: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '82%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  userText: {
    ...typography.body,
    lineHeight: 22,
  },
  assistantContainer: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderName: {
    ...typography.caption,
    fontWeight: '600',
  },
  copyButton: {
    marginLeft: spacing.xs,
    padding: 2,
  },
  assistantBubble: {
    maxWidth: '100%',
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
  },
  assistantText: {
    ...typography.body,
    lineHeight: 23,
  },
});
