import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Check, Sparkles, Pin } from 'lucide-react-native';
import { Memory, MemoryCategory } from '@kairo/shared';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface EditMemoryModalProps {
  visible: boolean;
  editingMemory?: Memory | null;
  onSave: (content: string, category: MemoryCategory, importance: number, isPinned: boolean) => Promise<boolean>;
  onClose: () => void;
}

const CATEGORIES: MemoryCategory[] = ['preference', 'fact', 'goal', 'project', 'routine'];

export const EditMemoryModal: React.FC<EditMemoryModalProps> = ({
  visible,
  editingMemory,
  onSave,
  onClose,
}) => {
  const { colors } = useTheme();

  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('preference');
  const [importance, setImportance] = useState<number>(7);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (editingMemory) {
      setContent(editingMemory.content);
      setCategory(editingMemory.category);
      setImportance(editingMemory.importance_score);
      setIsPinned(editingMemory.is_pinned);
    } else {
      setContent('');
      setCategory('preference');
      setImportance(7);
      setIsPinned(false);
    }
  }, [editingMemory, visible]);

  const handleSave = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onSave(content.trim(), category, importance, isPinned);
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {/* Modal Header */}
            <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {editingMemory ? 'Edit Memory' : 'Remember New Fact'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Category Picker */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.catOption,
                        {
                          backgroundColor: isSelected ? colors.accentSubtle : colors.surfaceSecondary,
                          borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
                          { color: isSelected ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Memory Content Input */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
                MEMORY CONTENT
              </Text>
              <TextInput
                style={[
                  styles.contentInput,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Prefers deep work mornings, working on Orbit v1 release..."
                placeholderTextColor={colors.textTertiary}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
              />

              {/* Importance Score Selector (1-10) */}
              <View style={styles.scoreRow}>
                <View style={styles.scoreLabelGroup}>
                  <Sparkles size={14} color={colors.accent} />
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    IMPORTANCE SCORE ({importance}/10)
                  </Text>
                </View>

                <View style={styles.scoreButtons}>
                  {[1, 3, 5, 7, 9, 10].map((score) => {
                    const isSelected = importance === score;
                    return (
                      <TouchableOpacity
                        key={score}
                        onPress={() => setImportance(score)}
                        style={[
                          styles.scoreBtn,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreBtnText,
                            { color: isSelected ? colors.accentText : colors.textSecondary },
                          ]}
                        >
                          {score}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Pin to context toggle */}
              <TouchableOpacity
                onPress={() => setIsPinned(!isPinned)}
                style={[styles.pinToggle, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Pin size={16} color={isPinned ? colors.accent : colors.textTertiary} fill={isPinned ? colors.accent : 'none'} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.pinTitle, { color: colors.textPrimary }]}>
                    Pin to Priority Context
                  </Text>
                  <Text style={[styles.pinSubtitle, { color: colors.textTertiary }]}>
                    Always include this memory in system prompt
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: isPinned ? colors.accent : 'transparent',
                      borderColor: isPinned ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {isPinned && <Check size={12} color={colors.accentText} />}
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={!content.trim() || isSubmitting}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.accent,
                    opacity: !content.trim() || isSubmitting ? 0.6 : 1,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={[styles.saveText, { color: colors.accentText }]}>
                    {editingMemory ? 'Update Memory' : 'Save Memory'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    width: '100%',
  },
  modalCard: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.subheading,
    fontWeight: '700',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  catOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  catOptionText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  scoreRow: {
    marginTop: spacing.md,
  },
  scoreLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scoreBtn: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnText: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  pinTitle: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  pinSubtitle: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
});
