import { Card } from '../../components/common/Card';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, Easing } from 'react-native';
import { ShieldCheck, Brain, ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: ShieldCheck,
      badge: 'Your personal workspace',
      title: 'Less to carry.\nMore room to think.',
      description:
        'Bring your plans, notes and conversations together. Sign in to your own account before connecting private information.',
    },
    {
      icon: Brain,
      badge: 'Memory you can review',
      title: 'Keep the details.\nSee the bigger picture.',
      description:
        'Review and edit the notes Orbit keeps about you, and remove any of them whenever you like.',
    },
    {
      icon: Sparkles,
      badge: 'Connected, with care',
      title: 'Your inbox.\nYour day. Your call.',
      description:
        'Connect Gmail for read-only access when you are ready. Sending email and calendar changes stay off.',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[currentSlide];
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [currentSlide]);
  const Icon = slide.icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Sparkles size={16} color={colors.accent} />
          <Text style={[styles.brandText, { color: colors.textPrimary }]}>Orbit</Text>
        </View>
        <TouchableOpacity onPress={onComplete} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }], width: '100%', alignItems: 'center' }}>
      <Card style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.accentSubtle }]}>
            <Icon size={36} color={colors.accent} />
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>{slide.badge}</Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{slide.description}</Text>
      </Card>
      </Animated.View>

      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentSlide ? colors.accent : colors.surfaceHover,
                  width: index === currentSlide ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.nextButtonText, { color: colors.accentText }]}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <ArrowRight size={18} color={colors.accentText} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandText: {
    ...typography.subheading,
    fontWeight: '700',
  },
  skipButton: {
    padding: spacing.xs,
  },
  skipText: {
    ...typography.caption,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    marginHorizontal: spacing.xxl,
    maxWidth: 540,
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.display,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: 'row',
    height: 54,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
