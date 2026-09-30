import React, { useEffect, useState, Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { safeStorage } from './src/utils/safeStorage';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null; stack: string | null }> {
  state = { hasError: false, error: null as Error | null, stack: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('Orbit UI Render Error:', error, info);
    this.setState({ stack: (info?.componentStack || error?.stack || '').trim() });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0B0F19', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#00F0FF', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Orbit UI Recovered</Text>
          <Text style={{ color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
            {this.state.error?.message}
          </Text>
          {this.state.stack ? (
            <View style={{ backgroundColor: '#131A2B', padding: 12, borderRadius: 8, maxWidth: '90%', marginBottom: 16 }}>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>
                {this.state.stack}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity onPress={() => this.setState({ hasError: false, error: null, stack: null })} style={{ backgroundColor: '#00F0FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: '#0B0F19', fontWeight: 'bold' }}>Reload Interface</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    safeStorage.getItem('orbit_onboarding_completed').then((val) => {
      if (val === 'true') {
        setHasCompletedOnboarding(true);
      }
    });
  }, []);

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    safeStorage.setItem('orbit_onboarding_completed', 'true');
  };

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
        <OnboardingScreen onComplete={handleOnboardingComplete} />
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
    <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineSyncBanner />
      {renderScreen()}
    </View>
  );
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={initialMetrics} style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#090D16' }}>
        <ThemeProvider>
          <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#090D16' }}>
            <MainAppNavigator />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
