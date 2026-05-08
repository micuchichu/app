import { Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { Currency, getDefaultCurrency } from '@/hooks/utils';
import { supabase } from '@/lib/supabase';

interface CurrencyDropdownModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
}

export function CurrencyDropdownModal({ visible, onClose, selectedCurrency, onSelectCurrency }: CurrencyDropdownModalProps) {
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [dbCurrencies, setDbCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('currency_text')
        .order('currency_text');
      
      if (data && !error) {
        setDbCurrencies(data.map(c => ({ code: c.currency_text, symbol: '' })));
      }
    };

    if (visible && dbCurrencies.length === 0) {
      fetchCurrencies();
    }
  }, [visible]);

  const uniqueCurrencies = Array.from(new Map([getDefaultCurrency(), ...dbCurrencies].map(item => [item.code, item])).values())
    .sort((a, b) => a.code.localeCompare(b.code));

  const filteredCurrencies = uniqueCurrencies.filter(currency => 
    currency.code.toLowerCase().includes(currencySearchQuery.toLowerCase())
  );

  const handleSelect = (currency: Currency) => {
    onSelectCurrency(currency);
    setCurrencySearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setCurrencySearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.currencyDropdownMenu}>
          <View style={styles.searchBarContainer}>
            <Search size={16} color="#71717a" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#71717a"
              value={currencySearchQuery}
              onChangeText={setCurrencySearchQuery}
              autoCorrect={false}
            />
          </View>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((currency) => (
                <TouchableOpacity 
                  key={currency.code} 
                  style={[
                    styles.currencyOption, 
                    selectedCurrency.code === currency.code && { backgroundColor: '#27272a' }
                  ]} 
                  onPress={() => handleSelect(currency)}
                >
                  <Text style={[
                    styles.currencyOptionText, 
                    selectedCurrency.code === currency.code && { color: '#8b5cf6', fontWeight: 'bold' }
                  ]}>
                    {currency.code}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: '#71717a', textAlign: 'center', padding: 15 }}>No results</Text>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  currencyDropdownMenu: { backgroundColor: '#18181b', borderRadius: 16, width: 220, maxHeight: 300, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden', paddingBottom: 10 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090b', borderRadius: 10, paddingHorizontal: 12, margin: 10, borderWidth: 1, borderColor: '#27272a' },
  searchInput: { flex: 1, color: 'white', padding: 10, fontSize: 14 },
  currencyOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  currencyOptionText: { color: 'white', textAlign: 'center', fontSize: 16 }
});