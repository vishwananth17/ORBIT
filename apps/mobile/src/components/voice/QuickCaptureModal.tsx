// ============================================================================
// Quick Capture Modal Component
// Rapid voice or text brain dump modal with instant AI classification
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Sparkles, Check, ArrowRight, Brain, Calendar, CheckSquare, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { voiceService } from '../../services/voiceService';
import { VoiceRecordButton } from './VoiceRecordButton';
import { QuickCaptureResult } from '@orbit/shared';

interface QuickCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: QuickCaptureResult) => void;
}

export function QuickCaptureModal({ visible, onClose, onSuccess }: QuickCaptureModalProps) {
  const { colors } = useTheme();
  const { token } = useAuthStore();

  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<QuickCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timer while recording
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording) {
      setRecordSeconds(0);
      timer = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const handleToggleVoice = async () => {
    if (!isRecording) {
      setError(null);
      const started = await voiceService.startRecording();
      if (started) {
        setIsRecording(true);
      } else {
        setError('Microphone permission required');
      }
    } else {
      setIsRecording(false);
      setIsProcessing(true);
      try {
        const audio = await voiceService.stopRecording();
        if (audio && audio.base64) {
          const res = await apiClient.quickCapture(undefined, audio.base64, token);
          setResult(res.result);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (onSuccess) onSuccess(res.result);
        } else {
          setError('No audio recorded');
        }
      } catch (err: any) {
        setError(err.message || 'Quick capture failed');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiClient.quickCapture(textInput.trim(), undefined, token);
      setResult(res.result);
      setTextInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onSuccess) onSuccess(res.result);
    } catch (err: any) {
      setError(err.message || 'Quick capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setTextInput('');
    setIsRecording(false);
  };

  const handleClose = () => {
    if (isRecording) {
      voiceService.stopRecording();
      setIsRecording(false);
    }
    handleReset();
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'memory':
        return <Brain size={18} color={colors.accent} />;
      case 'calendar_event':
        return <Calendar size={18} color={colors.textSecondary} />;
      case 'task':
        return <CheckSquare size={18} color={colors.textSecondary} />;
      default:
        return <FileText size={18} color={colors.textSecondary} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Quick Capture</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Result Receipt View */}
          {result ? (
            <View style={styles.resultContainer}>
              <View style={[styles.receiptCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View style={styles.receiptCategoryRow}>
                  <View style={styles.categoryBadge}>
                    {getCategoryIcon(result.category)}
                    <Text style={[styles.categoryText, { color: colors.textPrimary }]}>
                      {(result.category || '').toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={[styles.confidenceBadge, { backgroundColor: colors.accent + '20' }]}>
                    <Check size={12} color={colors.accent} style={{ marginRight: 3 }} />
                    <Text style={[styles.confidenceText, { color: colors.accent }]}>Classified</Text>
                  </View>
                </View>

                <Text style={[styles.receiptSummary, { color: colors.textPrimary }]}>
                  {result.summary}
                </Text>

                <Text style={[styles.receiptRaw, { color: colors.textSecondary }]}>
                  "{result.raw_input}"
                </Text>
              </View>

              <View style={styles.receiptActions}>
                <TouchableOpacity
                  onPress={handleReset}
                  style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Capture Another</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.actionBtnPrimary, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.actionBtnPrimaryText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Tab Selector: Voice vs Text */}
              <View style={[styles.tabBar, { backgroundColor: colors.surfaceSecondary }]}>
                <TouchableOpacity
                  onPress={() => setInputMode('voice')}
                  style={[
                    styles.tabItem,
                    inputMode === 'voice' && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: inputMode === 'voice' ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    Voice Brain Dump
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInputMode('text')}
                  style={[
                    styles.tabItem,
                    inputMode === 'text' && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: inputMode === 'text' ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    Type Note
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              )}

              {/* Voice Mode */}
              {inputMode === 'voice' ? (
                <View style={styles.voiceSection}>
                  <Text style={[styles.voiceInstruction, { color: colors.textSecondary }]}>
                    {isRecording
                      ? `Listening • ${formatTimer(recordSeconds)}`
                      : isProcessing
                      ? 'Synthesizing & classifying thoughts...'
                      : 'Tap to speak any task, memory, or note.'}
                  </Text>

                  <View style={styles.micContainer}>
                    <VoiceRecordButton
                      size={72}
                      isRecording={isRecording}
                      isTranscribing={isProcessing}
                      onPress={handleToggleVoice}
                    />
                  </View>

                  <Text style={[styles.voiceSub, { color: colors.textSecondary }]}>
                    {isRecording ? 'Tap square to finish' : 'Orbit automatically organizes where it belongs'}
                  </Text>
                </View>
              ) : (
                /* Text Mode */
                <View style={styles.textSection}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        color: colors.textPrimary,
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    placeholder="e.g. Sarah's birthday is on October 14, or Prepare pitch deck tomorrow at 2 PM"
                    placeholderTextColor={colors.textSecondary}
                    value={textInput}
                    onChangeText={setTextInput}
                    autoFocus
                  />

                  <TouchableOpacity
                    onPress={handleTextSubmit}
                    disabled={isProcessing || !textInput.trim()}
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor: textInput.trim() ? colors.accent : colors.surfaceSecondary,
                        opacity: isProcessing ? 0.6 : 1,
                      },
                    ]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.accentText} />
                    ) : (
                      <>
                        <Text style={[styles.submitText, { color: textInput.trim() ? colors.accentText : colors.textSecondary }]}>
                          Classify & Save
                        </Text>
                        <ArrowRight size={16} color={textInput.trim() ? colors.accentText : colors.textSecondary} style={{ marginLeft: 4 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 40,
    minHeight: 380,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  voiceInstruction: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  micContainer: {
    marginVertical: 12,
  },
  voiceSub: {
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
  textSection: {
    marginTop: 4,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  resultContainer: {
    paddingVertical: 12,
  },
  receiptCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  receiptCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
  },
  receiptSummary: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  receiptRaw: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: "#000000",
  },
});
