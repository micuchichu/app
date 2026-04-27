import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

export const LocationDropdownModal = ({ visible, locations, selectedId, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.dropdownBox}>
                <Text style={styles.dropdownHeader}>Select a Previous Location</Text>
                <FlatList 
                    data={locations} keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.dropdownItem} onPress={() => onSelect(item.id)}>
                            <Text style={[styles.dropdownItemText, selectedId === item.id && { color: '#8b5cf6', fontWeight: 'bold' }]}>
                                {item.city_name}, {item.country_code}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </TouchableOpacity>
    </Modal>
);

const styles = StyleSheet.create({
    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdownBox: {
    backgroundColor: '#18181b',
    width: '100%',
    maxHeight: '60%',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 15,
  },
  dropdownHeader: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 5,
  },
  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 16,
  },
});