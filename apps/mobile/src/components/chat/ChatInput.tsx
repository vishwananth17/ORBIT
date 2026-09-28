import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { ArrowUp, Square, Mic } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.borderSubtle }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.micButton}
            accessibilityLabel="Voice dictation"
            onPress={() => {
              // Phase 5 voice trigger placeholder
            }}
          >
            <Mic size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Message Orbit..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={4000}
            editable={!disabled}
            onSubmitEditing={(e) => {
              // On desktop/web enter sends, on mobile shift+enter
              if (Platform.OS === 'web' && !(e.nativeEvent as any).shiftKey) {
                handleSend();
              }
            }}
          />

          {isStreaming ? (
            <TouchableOpacity
              onPress={onStopStreaming}
              style={[styles.actionButton, { backgroundColor: colors.destructive }]}
              accessibilityLabel="Stop generating response"
            >
              <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || disabled}
              style={[
                styles.actionButton,
                {
                  backgroundColor: inputText.trim() ? colors.accent : colors.surfaceSecondary,
                  opacity: inputText.trim() ? 1 : 0.5,
                },
              ]}
              accessibilityLabel="Send message"
            >
              <ArrowUp size={16} color={inputText.trim() ? colors.accentText : colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 4,
    minHeight: 48,
    maxHeight: 120,
  },
  micButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});
