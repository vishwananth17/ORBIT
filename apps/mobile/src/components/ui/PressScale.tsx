import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Pressable with a subtle spring scale + dim on press. Drop-in for TouchableOpacity.
export const PressScale: React.FC<PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number }> = ({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const v = useRef(new Animated.Value(0)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => { to(1); onPressIn?.(e); }}
      onPressOut={(e) => { to(0); onPressOut?.(e); }}
    >
      <Animated.View
        style={[
          style as any,
          {
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }],
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }),
          },
        ]}
      >
        {children as React.ReactNode}
      </Animated.View>
    </Pressable>
  );
};
