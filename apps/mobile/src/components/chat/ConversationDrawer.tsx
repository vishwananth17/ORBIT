import React from 'react';
import { View, Modal, StyleSheet, SafeAreaView, TouchableWithoutFeedback } from 'react-native';
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

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({ visible, onClose, ...rest }) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <SafeAreaView style={styles.drawer}>
        <SidebarPanel {...rest} onClose={onClose} />
      </SafeAreaView>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: { width: '82%', maxWidth: 360, height: '100%' },
  scrim: { flex: 1 },
});
