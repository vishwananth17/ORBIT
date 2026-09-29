import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAuthStore } from './src/store/authStore';
import { OnboardingScreen } from './src/screens/auth/OnboardingScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { ChatScreen } from './src/screens/chat/ChatScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';
import { MemoryVaultScreen } from './src/screens/memory/MemoryVaultScreen';
import { IntegrationsScreen } from './src/screens/integrations/IntegrationsScreen';
import { TodayScreen } from './src/screens/today/TodayScreen';
import { NotificationSettingsScreen } from './src/screens/settings/NotificationSettingsScreen';
import { CustomAgentsScreen } from './src/screens/agents/CustomAgentsScreen';
import { JournalScreen } from './src/screens/journal/JournalScreen';
import { OfflineSyncBanner } from './src/components/common/OfflineSyncBanner';
import { offlineSyncService } from './src/services/offlineSyncService';

type AppScreen = 'today' | 'chat' | 'memory' | 'settings' | 'integrations' | 'notifications' | 'agents' | 'journal';

function MainAppNavigator() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isBiometricLocked, isLoading, initialize } = useAuthStore();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('today');
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | null>(null);

  useEffect(() => {
    initialize();
    offlineSyncService.initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // 1. First-time Onboarding Flow
  if (!hasCompletedOnboarding) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onComplete={() => setHasCompletedOnboarding(true)} />
      </>
    );
  }

  // 2. Auth Guard / Biometric Lock
  if (!isAuthenticated || isBiometricLocked) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LoginScreen />
      </>
    );
  }

  // 3. Authenticated App Flow
  const renderScreen = () => {
    switch (currentScreen) {
      case 'today':
        return (
          <TodayScreen
            onOpenChat={(prompt) => {
              setInitialChatPrompt(prompt || null);
              setCurrentScreen('chat');
            }}
            onOpenSettings={() => setCurrentScreen('settings')}
            onOpenJournal={() => setCurrentScreen('journal')}
            onOpenAgents={() => setCurrentScreen('agents')}
          />
        );
      case 'notifications':
        return <NotificationSettingsScreen onBack={() => setCurrentScreen('settings')} />;
      case 'memory':
        return <MemoryVaultScreen onBack={() => setCurrentScreen('chat')} />;
      case 'integrations':
        return <IntegrationsScreen onBack={() => setCurrentScreen('settings')} />;
      case 'agents':
        return (
          <CustomAgentsScreen
            onBack={() => setCurrentScreen('chat')}
            onSelectAgentForChat={() => setCurrentScreen('chat')}
          />
        );
      case 'journal':
        return (
          <JournalScreen
            onBack={() => setCurrentScreen('today')}
            onOpenChatWithReflection={(reflectionText) => {
              setInitialChatPrompt(`Let's discuss my daily reflection: "${reflectionText}"`);
              setCurrentScreen('chat');
            }}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => setCurrentScreen('chat')}
            onOpenIntegrations={() => setCurrentScreen('integrations')}
            onOpenNotifications={() => setCurrentScreen('notifications')}
            onOpenAgents={() => setCurrentScreen('agents')}
            onOpenJournal={() => setCurrentScreen('journal')}
          />
        );
      case 'chat':
      default:
        return (
          <ChatScreen
            onOpenSettings={() => setCurrentScreen('settings')}
            onOpenMemoryVault={() => setCurrentScreen('memory')}
            onOpenToday={() => setCurrentScreen('today')}
            onOpenAgents={() => setCurrentScreen('agents')}
            initialPrompt={initialChatPrompt}
          />
        );
    }
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineSyncBanner />
      {renderScreen()}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppNavigator />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
