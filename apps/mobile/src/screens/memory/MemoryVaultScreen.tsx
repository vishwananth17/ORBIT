import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Plus, Search, Brain, X, Sparkles } from 'lucide-react-native';
import { Memory, MemoryCategory } from '@kairo/shared';
import { useMemoryStore } from '../../store/memoryStore';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';
import { MemoryCard } from '../../components/memory/MemoryCard';
import { EditMemoryModal } from '../../components/memory/EditMemoryModal';

interface MemoryVaultScreenProps {
  onBack: () => void;
}

const CATEGORY_TABS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'preference', label: 'Preferences' },
  { id: 'fact', label: 'Facts' },
  { id: 'goal', label: 'Goals' },
  { id: 'project', label: 'Projects' },
  { id: 'routine', label: 'Routines' },
];

export const MemoryVaultScreen: React.FC<MemoryVaultScreenProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const {
    memories,
    selectedCategory,
    searchQuery,
    isLoading,
    loadMemories,
    setCategory,
    setSearchQuery,
    addMemory,
    editMemory,
    togglePin,
    deleteMemory,
  } = useMemoryStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const handleOpenAdd = () => {
    setEditingMemory(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (memory: Memory) => {
    setEditingMemory(memory);
    setModalVisible(true);
  };

  const handleSaveModal = async (
    content: string,
    category: MemoryCategory,
    importance: number,
    isPinned: boolean
  ): Promise<boolean> => {
    if (editingMemory) {
      return await editMemory(editingMemory.id, {
        content,
        importance_score: importance,
        is_pinned: isPinned,
      });
    } else {
      return await addMemory(content, category, importance, isPinned);
    }
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() || m.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back to chat">
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Brain size={18} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Memory Vault</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleOpenAdd}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          accessibilityLabel="Add memory manually"
        >
          <Plus size={16} color={colors.accentText} />
          <Text style={[styles.addBtnText, { color: colors.accentText }]}>Add Memory</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search recalled memories..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills Filter */}
      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setCategory(tab.id)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                    borderColor: isSelected ? colors.accent : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected ? colors.textPrimary : colors.textTertiary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Memory List */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredMemories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <MemoryCard
                memory={item}
                onEdit={handleOpenEdit}
                onDelete={deleteMemory}
                onTogglePin={togglePin}
              />
            )}
            onRefresh={loadMemories}
            refreshing={isLoading}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSecondary }]}>
                  <Sparkles size={24} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? 'No matching memories found' : 'Your Memory Vault is Clean'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Orbit continuously learns your working habits, projects, and goals from chats.
                  You can also add memories manually at any time.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Edit / Add Modal */}
      <EditMemoryModal
        visible={modalVisible}
        editingMemory={editingMemory}
        onSave={handleSaveModal}
        onClose={() => setModalVisible(false)}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.subheading,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addBtnText: {
    ...typography.caption,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    padding: 0,
  },
  categorySection: {
    paddingBottom: spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    ...typography.caption,
    fontSize: 12,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.subheading,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
});
