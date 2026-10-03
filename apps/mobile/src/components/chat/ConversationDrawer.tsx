import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, StyleSheet, SafeAreaView, Pressable, Animated, Dimensions } from 'react-native';
import { Conversation } from '@orbit/shared';
import { SidebarPanel, SidebarNavItem } from './SidebarPanel';

interface ConversationDrawerProps {
  visible: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClose: () => void;
  navItems?: SidebarNavItem[];
}

const WIDTH = Math.min(Dimensions.get('window').width * 0.82, 360);

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({ visible, onClose, ...rest }) => {
  const [mounted, setMounted] = useState(visible);
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(p, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }).start();
    } else {
      Animated.timing(p, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, p]);

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          style={[styles.drawer, { width: WIDTH, transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, 0] }) }] }]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <SidebarPanel {...rest} onClose={onClose} />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
