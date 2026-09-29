// ============================================================================
// Voice Record Button Component
// Pulsing interactive microphone button with haptic feedback
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';

interface VoiceRecordButtonProps {
  isRecording: boolean;
  isTranscribing?: boolean;
  onPress: () => void;
  size?: number;
}

export function VoiceRecordButton({
  isRecording,
  isTranscribing = false,
  onPress,
  size = 44,
}: VoiceRecordButtonProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording]);

  const handlePress = () => {
    Haptics.impactAsync(
      isRecording
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium
    );
    onPress();
  };

  const buttonRadius = size / 2;

  return (
    <View style={[styles.container, { width: size + 16, height: size + 16 }]}>
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2,
              borderColor: colors.accent,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      <TouchableOpacity
        onPress={handlePress}
        disabled={isTranscribing}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: buttonRadius,
            backgroundColor: isRecording
              ? colors.destructive
              : colors.surfaceSecondary,
            borderColor: isRecording ? colors.destructive : colors.border,
          },
        ]}
      >
        {isTranscribing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : isRecording ? (
          <Square size={size * 0.4} color="#FFFFFF" />
        ) : (
          <Mic size={size * 0.45} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.5,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
