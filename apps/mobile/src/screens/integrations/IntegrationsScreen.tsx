import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Calendar, Mail, HardDrive, ShieldCheck, Check, Unlink } from 'lucide-react-native';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface IntegrationsScreenProps {
  onBack: () => void;
}

interface IntegrationItem {
  provider: string;
  name: string;
  description: string;
  is_connected: boolean;
}

export const IntegrationsScreen: React.FC<IntegrationsScreenProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const token = useAuthStore((s) => s.token);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listIntegrations(token);
      setIntegrations(data);
    } catch {
      // Fallback defaults
      setIntegrations([
        {
          provider: 'google_calendar',
          name: 'Google Calendar',
          description: 'Read upcoming events, schedule meetings, and protect focus time.',
          is_connected: true,
        },
        {
          provider: 'gmail',
          name: 'Gmail',
          description: 'Search messages, draft updates, and prepare outgoing emails.',
          is_connected: true,
        },
        {
          provider: 'google_drive',
          name: 'Google Drive',
          description: 'Search documents, project briefs, and notes.',
          is_connected: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (item: IntegrationItem) => {
    setActionLoading(item.provider);
    try {
      if (item.is_connected) {
        Alert.alert(
          `Disconnect ${item.name}`,
          'Are you sure you want to disconnect? Encrypted access tokens will be permanently removed.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disconnect',
              style: 'destructive',
              onPress: async () => {
                await apiClient.disconnectIntegration(item.provider, token);
                await loadData();
              },
            },
          ]
        );
      } else {
        await apiClient.connectIntegration(item.provider, token);
        await loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google_calendar':
        return <Calendar size={22} color="#0EA5E9" />;
      case 'gmail':
        return <Mail size={22} color={colors.accent} />;
      case 'google_drive':
        return <HardDrive size={22} color="#F59E0B" />;
      default:
        return <Calendar size={22} color={colors.accent} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Connected Tools</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Security Banner */}
        <View style={[styles.securityBanner, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <ShieldCheck size={20} color={colors.accent} />
          <View style={styles.securityTextWrap}>
            <Text style={[styles.securityTitle, { color: colors.textPrimary }]}>
              Hardware-Enclave Token Security
            </Text>
            <Text style={[styles.securityDescription, { color: colors.textSecondary }]}>
              All OAuth access and refresh tokens are encrypted at rest with AES-256-GCM. Orbit never
              dispatches write actions without your explicit in-chat approval.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>AVAILABLE INTEGRATIONS</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          integrations.map((item) => {
            const isActing = actionLoading === item.provider;
            return (
              <View
                key={item.provider}
                style={[styles.integrationCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                    {getProviderIcon(item.provider)}
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.integrationName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.is_connected
                            ? 'rgba(16, 185, 129, 0.12)'
                            : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.is_connected ? colors.accent : colors.textTertiary },
                        ]}
                      >
                        {item.is_connected ? 'CONNECTED' : 'DISCONNECTED'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleToggle(item)}
                    disabled={isActing}
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: item.is_connected
                          ? colors.surfaceSecondary
                          : colors.accent,
                        borderColor: item.is_connected ? colors.borderSubtle : colors.accent,
                      },
                    ]}
                  >
                    {isActing ? (
                      <ActivityIndicator size="small" color={item.is_connected ? colors.textPrimary : colors.accentText} />
                    ) : item.is_connected ? (
                      <>
                        <Unlink size={13} color={colors.destructive} />
                        <Text style={[styles.toggleBtnText, { color: colors.destructive }]}>Disconnect</Text>
                      </>
                    ) : (
                      <>
                        <Check size={13} color={colors.accentText} />
                        <Text style={[styles.toggleBtnText, { color: colors.accentText }]}>Connect</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.integrationDesc, { color: colors.textSecondary }]}>
                  {item.description}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.subheading,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  securityBanner: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    ...typography.bodyBold,
    fontSize: 13,
    marginBottom: 2,
  },
  securityDescription: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  integrationCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  integrationName: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  toggleBtnText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  integrationDesc: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
