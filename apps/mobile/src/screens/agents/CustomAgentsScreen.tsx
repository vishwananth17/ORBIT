import { LineIcon } from '../../components/common/LineIcon';
import { Check, X as CloseIcon } from 'lucide-react-native';
// ============================================================================
// Custom Agents & Personas Screen (Phase 6)
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAgentStore } from '../../store/agentStore';
import { CustomAgent } from '@orbit/shared';

const AVAILABLE_ICONS = ['bot', 'briefcase', 'shield', 'trending-up', 'book-open', 'zap', 'code', 'feather'];
const AVAILABLE_TOOLS = [
  { id: 'calendar_read', label: 'Read Calendar' },
  { id: 'calendar_write', label: 'Modify Calendar' },
  { id: 'tasks_manage', label: 'Tasks & Reminders' },
  { id: 'memory_search', label: 'Memory Search' },
  { id: 'send_email', label: 'Draft & Send Email' },
];

interface Props {
  onBack: () => void;
  onSelectAgentForChat?: (agent: CustomAgent) => void;
}

export function CustomAgentsScreen({ onBack, onSelectAgentForChat }: Props) {
  const { colors } = useTheme();
  const {
    agents,
    presets,
    activeAgent,
    isLoading,
    loadAgents,
    setActiveAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    setDefaultAgent,
  } = useAgentStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tone, setTone] = useState('');
  const [avatarIcon, setAvatarIcon] = useState('bot');
  const [selectedTools, setSelectedTools] = useState<string[]>(['calendar_read', 'tasks_manage', 'memory_search']);
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const openCreateModal = (preset?: any) => {
    setEditingAgent(null);
    if (preset) {
      setName(preset.name);
      setTagline(preset.tagline || '');
      setSystemPrompt(preset.system_prompt || '');
      setTone(preset.tone || 'thoughtful, proactive');
      setAvatarIcon(preset.avatar_icon || 'bot');
      setSelectedTools(preset.enabled_tools || ['calendar_read', 'tasks_manage', 'memory_search']);
      setIsDefault(false);
    } else {
      setName('');
      setTagline('');
      setSystemPrompt('');
      setTone('concise, thoughtful, proactive');
      setAvatarIcon('bot');
      setSelectedTools(['calendar_read', 'tasks_manage', 'memory_search']);
      setIsDefault(false);
    }
    setModalVisible(true);
  };

  const openEditModal = (agent: CustomAgent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setTagline(agent.tagline || '');
    setSystemPrompt(agent.system_prompt);
    setTone(agent.tone);
    setAvatarIcon(agent.avatar_icon || 'bot');
    setSelectedTools(agent.enabled_tools || []);
    setIsDefault(agent.is_default);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a persona name');
      return;
    }
    if (!systemPrompt.trim() || systemPrompt.length < 10) {
      Alert.alert('Required', 'System prompt must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, {
          name: name.trim(),
          tagline: tagline.trim() || undefined,
          system_prompt: systemPrompt.trim(),
          tone: tone.trim() || undefined,
          avatar_icon: avatarIcon,
          enabled_tools: selectedTools,
          is_default: isDefault,
        });
      } else {
        await createAgent({
          name: name.trim(),
          tagline: tagline.trim() || undefined,
          system_prompt: systemPrompt.trim(),
          tone: tone.trim() || undefined,
          avatar_icon: avatarIcon,
          enabled_tools: selectedTools,
          is_default: isDefault,
        });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save custom agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (agent: CustomAgent) => {
    Alert.alert(
      'Delete Persona',
      `Are you sure you want to delete "${agent.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAgent(agent.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete agent');
            }
          },
        },
      ]
    );
  };

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Personas & Agents</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => openCreateModal()}
        >
          <Text style={[styles.addBtnText, { color: colors.accentText }]}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Active Persona Banner */}
        <View style={[styles.activeBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>CURRENT ACTIVE PERSONA</Text>
          <View style={styles.activeRow}>
            <LineIcon name={activeAgent?.avatar_icon || 'bot'} color={colors.accent} size={26} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeName, { color: colors.textPrimary }]}>
                {activeAgent ? activeAgent.name : 'Orbit Default Agent'}
              </Text>
              <Text style={[styles.activeSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {activeAgent?.tagline || 'Standard concise, proactive, multi-tool assistant'}
              </Text>
            </View>
          </View>
        </View>

        {/* Your Personas Section */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Custom Personas</Text>

        {isLoading && agents.length === 0 ? (
          <ActivityIndicator style={{ marginVertical: 32 }} color={colors.accent} />
        ) : (
          agents.map((agent) => {
            const isActive = activeAgent?.id === agent.id;
            return (
              <View
                key={agent.id}
                style={[
                  styles.agentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isActive ? colors.accent : colors.border,
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <LineIcon name={agent.avatar_icon} color={colors.accent} size={26} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.agentName, { color: colors.textPrimary }]}>{agent.name}</Text>
                      {agent.is_default && (
                        <View style={[styles.badgeDefault, { backgroundColor: colors.accent + '25' }]}>
                          <Text style={[styles.badgeText, { color: colors.accent }]}>Default</Text>
                        </View>
                      )}
                    </View>
                    {agent.tagline ? (
                      <Text style={[styles.agentTagline, { color: colors.textSecondary }]} numberOfLines={2}>
                        {agent.tagline}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Tone & Tools */}
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Tone: </Text>
                  <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    {agent.tone}
                  </Text>
                </View>

                <View style={styles.toolsChips}>
                  {(agent.enabled_tools || []).map((t) => (
                    <View key={t} style={[styles.toolChip, { backgroundColor: colors.border + '60' }]}>
                      <Text style={[styles.toolChipText, { color: colors.textSecondary }]}>{t.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: isActive ? colors.accent : colors.surfaceSecondary },
                    ]}
                    onPress={() => {
                      setActiveAgent(agent);
                      if (onSelectAgentForChat) onSelectAgentForChat(agent);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isActive ? <Check size={14} color={colors.accentText} strokeWidth={1.75} /> : null}
                      <Text style={[styles.actionBtnText, { color: isActive ? colors.accentText : colors.textPrimary }]}>
                        {isActive ? 'Active' : 'Use in Chat'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {!agent.is_default && (
                    <TouchableOpacity
                      style={styles.textActionBtn}
                      onPress={() => setDefaultAgent(agent.id)}
                    >
                      <Text style={[styles.textActionText, { color: colors.accent }]}>Make Default</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.textActionBtn} onPress={() => openEditModal(agent)}>
                    <Text style={[styles.textActionText, { color: colors.textSecondary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.textActionBtn} onPress={() => handleDelete(agent)}>
                    <Text style={[styles.textActionText, { color: colors.destructive }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Templates & Presets Section */}
        {presets && presets.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Instant Persona Templates</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Clone one of these battle-tested personas to jumpstart your workflow:
            </Text>

            {presets.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.presetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => openCreateModal(preset)}
              >
                <LineIcon name={preset.avatar_icon} color={colors.accent} size={26} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.presetName, { color: colors.textPrimary }]}>{preset.name}</Text>
                  <Text style={[styles.presetTagline, { color: colors.textSecondary }]} numberOfLines={2}>
                    {preset.tagline}
                  </Text>
                </View>
                <Text style={[styles.presetAdd, { color: colors.accent }]}>+ Clone</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create / Edit Agent Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingAgent ? 'Edit Persona' : 'Create Custom Persona'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <CloseIcon size={20} color={colors.textSecondary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 16 }}>
              {/* Avatar Icon Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ICON</Text>
              <View style={styles.iconSelectorRow}>
                {AVAILABLE_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconSelectBtn,
                      {
                        borderColor: avatarIcon === icon ? colors.accent : colors.border,
                        backgroundColor: avatarIcon === icon ? colors.accent + '20' : colors.surface,
                      },
                    ]}
                    onPress={() => setAvatarIcon(icon)}
                  >
                    <LineIcon name={icon} color={colors.textPrimary} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NAME</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Code Architect, Executive Coach"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Tagline */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TAGLINE / SPECIALTY</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={tagline}
                onChangeText={setTagline}
                placeholder="Brief summary of what this persona excels at"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Tone */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TONE & MANNER</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={tone}
                onChangeText={setTone}
                placeholder="e.g. incisive, Socratic, demanding, encouraging"
                placeholderTextColor={colors.textSecondary}
              />

              {/* System Prompt */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SYSTEM PROMPT INSTRUCTIONS</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
                ]}
                value={systemPrompt}
                onChangeText={setSystemPrompt}
                multiline
                numberOfLines={5}
                placeholder="Detailed instructions describing the persona, thought process, and rules..."
                placeholderTextColor={colors.textSecondary}
              />

              {/* Enabled Tools */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TOOL ACCESS WHITELIST</Text>
              <View style={styles.toolsList}>
                {AVAILABLE_TOOLS.map((tool) => {
                  const enabled = selectedTools.includes(tool.id);
                  return (
                    <TouchableOpacity
                      key={tool.id}
                      style={[
                        styles.toolToggleItem,
                        {
                          backgroundColor: colors.surface,
                          borderColor: enabled ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => toggleTool(tool.id)}
                    >
                      <Text style={[styles.toolToggleText, { color: colors.textPrimary }]}>{tool.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {enabled ? <Check size={14} color={colors.accent} strokeWidth={1.75} /> : null}
                        <Text style={{ color: enabled ? colors.accent : colors.textSecondary, fontWeight: '700' }}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Set as Default Toggle */}
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Set as Default Persona</Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors.accentText }]}>{editingAgent ? 'Save Changes' : 'Create Persona'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  activeBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  activeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  activeSub: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: 14,
  },
  agentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00000015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentEmoji: {
    fontSize: 22,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  badgeDefault: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  agentTagline: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    flex: 1,
  },
  toolsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  toolChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  toolChipText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  textActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  presetEmoji: {
    fontSize: 24,
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  presetTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  presetAdd: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 18,
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  iconSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconSelectBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  toolsList: {
    gap: 8,
  },
  toolToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toolToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
