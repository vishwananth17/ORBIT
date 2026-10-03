import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, StyleProp, AccessibilityInfo } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!mounted) return;
      Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 180, useNativeDriver: true }).start();
    }).catch(() => opacity.setValue(1));
    return () => { mounted = false; };
  }, [opacity]);
  return <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle,
    opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }, style]}>{children}</Animated.View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 20, padding: 20, marginBottom: 16 } });
