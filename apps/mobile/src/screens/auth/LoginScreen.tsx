import { Card } from '../../components/common/Card';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Sparkles, Fingerprint, Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

export const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    loginWithEmail,
    loginAsGuest,
    unlockWithBiometrics,
    isBiometricsSupported,
    isBiometricLocked,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    await loginWithEmail(email.trim(), password.trim());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          {/* Logo & Headline */}
          <View style={styles.header}>
            <View style={[styles.logoIcon, { backgroundColor: colors.accentSubtle }]}>
              <Sparkles size={28} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to Orbit</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Keep your day, conversations and plans in one place.
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorCard, { backgroundColor: colors.destructiveSubtle, borderColor: colors.destructive }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <Card style={styles.form}>
            <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Mail size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) clearError();
                }}
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Lock size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) clearError();
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading || !email.trim() || !password.trim()}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.accent,
                  opacity: isLoading || !email.trim() || !password.trim() ? 0.6 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Biometric Unlock Trigger */}
            {isBiometricsSupported && (
              <TouchableOpacity
                onPress={unlockWithBiometrics}
                style={[styles.biometricButton, { borderColor: colors.borderSubtle }]}
              >
                <Fingerprint size={18} color={colors.accent} />
                <Text style={[styles.biometricButtonText, { color: colors.textPrimary }]}>
                  {isBiometricLocked ? 'Unlock with Biometrics' : 'Biometric Quick Sign-In'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Quick Demo Access */}
            {process.env.EXPO_PUBLIC_DEMO_MODE === 'true' && <TouchableOpacity
              onPress={loginAsGuest}
              style={[styles.guestButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.guestButtonText, { color: colors.textSecondary }]}>
                Open demo
              </Text>
            </TouchableOpacity>}
          </Card>

          {/* Privacy badge footer */}
          <View style={styles.footer}>
            <ShieldCheck size={14} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Device biometrics unlock an existing signed-in session.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: '#94A3B8',
  },
  errorCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    fontSize: 13,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },
  primaryButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryButtonText: {
    ...typography.bodyBold,
  },
  biometricButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  biometricButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  guestButton: {
    height: 46,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxxl,
  },
  footerText: {
    ...typography.caption,
    fontSize: 12,
  },
});
