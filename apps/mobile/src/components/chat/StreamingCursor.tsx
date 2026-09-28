import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const StreamingCursor: React.FC = () => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.cursor,
        { backgroundColor: colors.accent, opacity },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  cursor: {
    width: 8,
    height: 16,
    borderRadius: 2,
    marginLeft: 4,
    display: 'inline-flex' as any,
    alignSelf: 'center',
  },
});
