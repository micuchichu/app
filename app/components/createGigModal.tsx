import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Modal, KeyboardAvoidingView } from 'react-native';

import { X, CheckCircle, ChevronDown } from 'lucide-react-native';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';
import { useAlert } from '@/app/components/alertContext';
import { CurrencyDropdownModal } from '@/app/components/currencyDropdownModal';
import { getDefaultCurrency } from '../hooks/utils';

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

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    onClose();
  };

  const handlePostGig = async () => {
    if (!title || !description || !price) {
      showAlert("Missing Fields", "Please fill out all the details for your service.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      const { error } = await supabase.from('services').insert({
        provider_id: user.id,
        title,
        description,
        base_price: parseFloat(price),
        currency: selectedCurrency.code
      });
      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showAlert("Success", "Your service has been posted!");
      handleClose();
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Offer a Service</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={isSubmitting}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>Create a listing for a skill you can offer to others.</Text>

            <Text style={styles.label}>Service Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. I will design a modern logo for you"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what you will deliver, your process, and why they should hire you..."
              placeholderTextColor={Colors.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Base Price</Text>
            
            <View style={styles.priceRow}>
              <TouchableOpacity 
                style={styles.currencyTrigger} 
                onPress={() => setIsCurrencyDropdownOpen(true)}
              >
                <Text style={styles.currencyTriggerText}>{selectedCurrency.code}</Text>
                <ChevronDown size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 50"
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
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Publish Service</Text>
                </>
              )}
            </TouchableOpacity>

            <CurrencyDropdownModal 
              visible={isCurrencyDropdownOpen} 
              onClose={() => setIsCurrencyDropdownOpen(false)}
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
            />

          </ScrollView>
        </View>

      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4, backgroundColor: '#27272a', borderRadius: 20 },
  
  scrollContent: { padding: 20 },
  subtitle: { color: Colors.textMuted || '#a1a1aa', fontSize: 15, marginBottom: 25, lineHeight: 22 },
  
  label: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#000', color: 'white', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46', fontSize: 16, marginBottom: 20 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  
  priceRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  currencyTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46', gap: 8 },
  currencyTriggerText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  priceInput: { flex: 1, backgroundColor: '#000', color: 'white', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46', fontSize: 16 },

  submitBtn: { flexDirection: 'row', backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});