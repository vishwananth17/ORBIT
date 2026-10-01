import { Card } from '../../components/common/Card';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
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
        'Review and edit saved preferences and project notes. Chat and memory need configured providers; they are not active in this preview.',
    },
    {
      icon: Sparkles,
      badge: 'Connected, with care',
      title: 'Your inbox.\nYour day. Your call.',
      description:
        'Google read access is ready for setup. Email sending and calendar changes remain off until the next tested rollout.',
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
