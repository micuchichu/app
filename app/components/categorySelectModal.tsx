import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, TextInput, 
  Modal, FlatList, ActivityIndicator 
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { Colors } from '@/app/constants/colors';

export interface JobCategory {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface CategorySelectModalProps {
  visible: boolean;
  onClose: () => void;
  categories: JobCategory[];
  selectedCategories: JobCategory[];
  onSelectCategory: (category: JobCategory) => void;
}

export function CategorySelectModal({ 
  visible, 
  onClose, 
  categories, 
  selectedCategories, 
  onSelectCategory 
}: CategorySelectModalProps) {
  
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleSelect = (category: JobCategory) => {
    setSearchQuery('');
    onSelectCategory(category);
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.categorySheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select a Skill</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeSheetBtn}>
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.categorySearchContainer}>
            <Search size={18} color={Colors.textMuted} style={styles.categorySearchIcon} />
            <TextInput
              style={styles.categorySearchInput}
              placeholder="Search categories..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          
          {categories.length === 0 ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : filteredCategories.length === 0 ? (
            <Text style={styles.noResultsText}>No categories found.</Text>
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedCategories.some(s => s.id === item.id);
                return (
                  <TouchableOpacity 
                    style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                    onPress={() => handleSelect(item)}
                    disabled={isSelected}
                  >
                    <Text style={[styles.categoryItemText, isSelected && styles.categoryItemTextSelected]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" 
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  categorySheet: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  closeSheetBtn: { padding: 6, backgroundColor: '#27272a', borderRadius: 20 },
  
  categorySearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 12, marginBottom: 15, borderWidth: 1, borderColor: '#3f3f46' },
  categorySearchIcon: { marginRight: 8 },
  categorySearchInput: { flex: 1, color: 'white', paddingVertical: 12, fontSize: 15 },
  noResultsText: { color: Colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 15 },

  categoryItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  categoryItemSelected: { opacity: 0.4 },
  categoryItemText: { color: 'white', fontSize: 16 },
  categoryItemTextSelected: { color: Colors.textMuted, textDecorationLine: 'line-through' },
});