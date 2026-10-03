import React, { useEffect, useState, Component, ReactNode } from 'react';
import { useWindowDimensions, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Sun, Brain, Bot, BookOpen, Settings } from 'lucide-react-native';
import { useChatStore } from './src/store/chatStore';
import { SidebarPanel, SidebarNavItem } from './src/components/chat/SidebarPanel';
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
        <View style={{ flex: 1, backgroundColor: '#000000', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', borderWidth: 1, borderRadius: 16, padding: 24 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Something went wrong</Text>
            <Text style={{ color: '#A3A3A3', fontSize: 15, lineHeight: 22, marginBottom: 20 }}>
              Orbit hit an error and stopped this screen. Your data is not affected. Try again.
            </Text>
            {__DEV__ && this.state.error?.message ? (
              <Text style={{ color: '#737373', fontSize: 12, marginBottom: 16 }}>{this.state.error.message}</Text>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => this.setState({ hasError: false, error: null, stack: null })}
              style={{ backgroundColor: '#FFFFFF', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#000000', fontWeight: '600', fontSize: 15 }}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

type AppScreen = 'today' | 'chat' | 'memory' | 'settings' | 'integrations' | 'notifications' | 'agents' | 'journal';

function MainAppNavigator() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 900;
  const chat = useChatStore();
  const { isAuthenticated, isBiometricLocked, isLoading, initialize } = useAuthStore();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('chat');
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
  const navItems: SidebarNavItem[] = [
    { key: 'today', label: 'Today', icon: Sun, onPress: () => setCurrentScreen('today'), active: currentScreen === 'today' },
    { key: 'memory', label: 'Memory', icon: Brain, onPress: () => setCurrentScreen('memory'), active: currentScreen === 'memory' },
    { key: 'agents', label: 'Agents', icon: Bot, onPress: () => setCurrentScreen('agents'), active: currentScreen === 'agents' },
    { key: 'journal', label: 'Journal', icon: BookOpen, onPress: () => setCurrentScreen('journal'), active: currentScreen === 'journal' },
    { key: 'settings', label: 'Settings', icon: Settings, onPress: () => setCurrentScreen('settings'), active: currentScreen === 'settings' || currentScreen === 'integrations' || currentScreen === 'notifications' },
  ];
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
            navItems={navItems}
            embedded={wide}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineSyncBanner />
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 272 }}>
            <SidebarPanel
              conversations={chat.conversations}
              activeConversationId={chat.activeConversationId}
              onSelectConversation={(id) => {
                chat.selectConversation(id);
                setCurrentScreen('chat');
              }}
              onNewChat={() => {
                chat.newChat();
                setCurrentScreen('chat');
              }}
              onDeleteConversation={(id) => chat.deleteConversation(id)}
              navItems={navItems}
            />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: 820 }}>{renderScreen()}</View>
          </View>
        </View>
      ) : (
        renderScreen()
      )}
    </View>
  );
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export default function App() {
  const { width } = useWindowDimensions();
  const authed = useAuthStore((st) => st.isAuthenticated);
  const fullWidth = Platform.OS === 'web' && width >= 900 && authed;
  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={initialMetrics} style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}>
        <ThemeProvider>
          <View style={styles.stage}>
            <View style={[styles.column, fullWidth && { maxWidth: undefined, borderLeftWidth: 0, borderRightWidth: 0 }]}>
              <MainAppNavigator />
            </View>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // On wide web screens the app renders as a centered phone-width column instead of stretching edge to edge.
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    ...(Platform.OS === 'web' ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1A1A1A' } : {}),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
