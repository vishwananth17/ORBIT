import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const Skeleton: React.FC<{ style?: StyleProp<ViewStyle>; width?: number | string; height?: number; radius?: number }> = ({
  style, width = '100%', height = 16, radius = 8,
}) => {
  const { colors } = useTheme();
  const o = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: colors.surfaceHover, opacity: o }, style]}
    />
  );
};
