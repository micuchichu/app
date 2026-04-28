import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, 
  Platform, ActivityIndicator, Modal, KeyboardAvoidingView, 
  Animated, PanResponder, Dimensions 
} from 'react-native';
import { X, CheckCircle, ChevronDown } from 'lucide-react-native';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';
import { useAlert } from '@/app/components/alertContext';
import { CurrencyDropdownModal } from '@/app/components/currencyDropdownModal';
import { getDefaultCurrency } from '../hooks/utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const HIDDEN_POSITION = SCREEN_HEIGHT;
const VISIBLE_POSITION = SCREEN_HEIGHT - SHEET_HEIGHT - 20; 

interface CreateGigModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateGigModal({ visible, onClose }: CreateGigModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(getDefaultCurrency());
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showAlert } = useAlert();
  const panY = useRef(new Animated.Value(HIDDEN_POSITION)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(panY, {
        toValue: VISIBLE_POSITION,
        useNativeDriver: true,
        bounciness: 5,
      }).start();
    } else {
      panY.setValue(HIDDEN_POSITION);
    }
  }, [visible]);

  const closeSheet = () => {
    Animated.timing(panY, {
      toValue: HIDDEN_POSITION,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      resetForm();
      onClose();
    });
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          panY.setValue(VISIBLE_POSITION + gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 150 || gesture.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(panY, {
            toValue: VISIBLE_POSITION,
            useNativeDriver: true,
            bounciness: 5,
          }).start();
        }
      },
    })
  ).current;

  const handlePostGig = async () => {
    if (!title || !description || !price) {
      showAlert("Missing Fields", "Please fill out all the details.");
      return;
    }

    const parsedPrice = parseFloat(price.replace(/,/g, '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showAlert("Invalid Price", "Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      const { data: currencyData } = await supabase
            .from('currencies')
            .select('currency_id')
            .ilike('currency_text', selectedCurrency.code.trim().toUpperCase()) 
            .maybeSingle(); 

      const { error } = await supabase.from('service_postings').insert({
        employee_id: user.id,
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        currency_id: currencyData?.currency_id || null
      });
      
      if (error) throw error;
      
      showAlert("Success", "Your service has been posted!");
      closeSheet();
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeSheet}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.avoidingView}
        >
          <Animated.View 
            style={[styles.sheetCard, { transform: [{ translateY: panY }] }]} {...panResponder.panHandlers}
          >
            <View style={styles.dragZone}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.header}>
              <Text style={styles.headerTitle}>Offer a Service</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={closeSheet}>
                <X size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.subtitle}>Create a listing for a skill you can offer to others.</Text>

              <Text style={styles.label}>Service Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Professional Logo Design"
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your process and what you deliver..."
                placeholderTextColor={Colors.textMuted}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>Base Price</Text>
              <View style={styles.priceRow}>
                <TouchableOpacity style={styles.currencyTrigger} onPress={() => setIsCurrencyDropdownOpen(true)}>
                  <Text style={styles.currencyTriggerText}>{selectedCurrency.code}</Text>
                  <ChevronDown size={16} color={Colors.textMuted} />
                </TouchableOpacity>
                <TextInput
                  style={styles.priceInput}
                  placeholder="50.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
                onPress={handlePostGig} 
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="white" /> : (
                  <>
                    <CheckCircle size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Publish Service</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>

        <CurrencyDropdownModal 
          visible={isCurrencyDropdownOpen} 
          onClose={() => setIsCurrencyDropdownOpen(false)}
          selectedCurrency={selectedCurrency}
          onSelectCurrency={setSelectedCurrency}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  avoidingView: { flex: 1, justifyContent: 'flex-end' },
  
  sheetCard: { 
    backgroundColor: '#18181b', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    height: SHEET_HEIGHT,
    width: '100%',
    marginBottom: 0, 
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20
  },

  dragZone: { width: '100%', height: 35, alignItems: 'center', justifyContent: 'center' },
  dragHandle: { width: 40, height: 5, backgroundColor: '#3f3f46', borderRadius: 3 },

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 25, 
    paddingBottom: 15 
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  closeBtn: { padding: 5, backgroundColor: '#27272a', borderRadius: 20 },

  scrollContent: { paddingHorizontal: 25, paddingBottom: 60 },
  subtitle: { color: '#a1a1aa', fontSize: 14, marginBottom: 25, lineHeight: 20 },
  
  label: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#000', color: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', fontSize: 16, marginBottom: 20 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  
  priceRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  currencyTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', gap: 8 },
  currencyTriggerText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  priceInput: { flex: 1, backgroundColor: '#000', color: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', fontSize: 16 },

  submitBtn: { flexDirection: 'row', backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});