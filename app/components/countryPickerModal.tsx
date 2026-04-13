import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Search, X } from 'lucide-react-native';

export const CountryPickerModal = ({ 
    visible, 
    onClose, 
    onSelect, 
    countryList, 
    selectedCountryCode, 
    isLoading 
}: any) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filters the list automatically when searchQuery changes
    const filteredList = useMemo(() => {
        return countryList.filter((country: any) => 
            country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            country.phone_prefix.includes(searchQuery)
        );
    }, [searchQuery, countryList]);

    const handleClose = () => {
        onClose();
        setSearchQuery(''); // Reset search when closing
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
                <View style={styles.dropdownBox}>
                    <Text style={styles.dropdownHeader}>Select Country Code</Text>
                    
                    <View style={styles.searchBarContainer}>
                        <Search size={18} color="#71717a" />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search country or code..."
                            placeholderTextColor="#71717a"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="small" color="#8b5cf6" style={{ marginVertical: 20 }} />
                    ) : (
                        <FlatList 
                            data={filteredList}
                            keyExtractor={(item) => item.code}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={<Text style={{color: '#71717a', textAlign: 'center', marginTop: 10}}>No countries found</Text>}
                            renderItem={({ item }) => {
                                const isSelected = selectedCountryCode === item.code;
                                return (
                                    <TouchableOpacity 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            onSelect(item);
                                            handleClose();
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Image source={{ uri: `https://flagcdn.com/w40/${item.code.toLowerCase()}.png` }} style={{ width: 28, height: 20, borderRadius: 2, marginRight: 15 }} />
                                            <Text style={[styles.dropdownItemText, { flex: 1 }, isSelected && { color: '#8b5cf6', fontWeight: 'bold' }]} numberOfLines={1}>{item.name}</Text>
                                            <Text style={[styles.dropdownItemText, isSelected ? { color: '#8b5cf6', fontWeight: 'bold' } : { color: '#a1a1aa' }]}>{item.phone_prefix}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    dropdownBox: { backgroundColor: '#18181b', width: '100%', maxHeight: '70%', borderRadius: 15, borderWidth: 1, borderColor: '#27272a', padding: 15 },
    dropdownHeader: { color: '#a1a1aa', fontSize: 14, fontWeight: 'bold', marginBottom: 15, marginLeft: 5 },
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090b', borderRadius: 10, paddingHorizontal: 12, marginBottom: 15, borderWidth: 1, borderColor: '#27272a' },
    searchInput: { flex: 1, color: 'white', padding: 12, fontSize: 16 },
    dropdownItem: { paddingVertical: 15, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#27272a' },
    dropdownItemText: { color: 'white', fontSize: 16 },
});