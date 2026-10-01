import { WifiOff } from 'lucide-react-native';
// ============================================================================
// Offline-First Network Status & Sync Banner (Phase 8)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSyncStore } from '../../store/syncStore';
import { offlineSyncService } from '../../services/offlineSyncService';
import { useTheme } from '../../theme/ThemeContext';

export function OfflineSyncBanner() {
  const { colors } = useTheme();
  const { status, pendingQueue } = useSyncStore();

  if (status === 'online') {
    return null;
  }

  const handleRetry = () => {
    offlineSyncService.checkConnectivity();
  };

  if (status === 'syncing') {
    return (
      <View style={[styles.banner, { backgroundColor: colors.accent + '25', borderColor: colors.accent }]}>
        <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
        <Text style={[styles.text, { color: colors.accent }]}>
          Syncing {pendingQueue.length > 0 ? `(${pendingQueue.length} items) ` : ''}with Orbit Cloud...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }]}>
      <WifiOff size={16} color={colors.warning} strokeWidth={1.6} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[styles.text, { color: '#F59E0B' }]}>
          Offline Mode • {pendingQueue.length > 0 ? `${pendingQueue.length} changes queued` : 'Local cache active'}
        </Text>
      </View>
      <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
        <Text style={[styles.retryText, { color: '#F59E0B' }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B80',
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
