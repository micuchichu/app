import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { DollarSign, X } from 'lucide-react-native';

import { trackEvent } from '@/app/lib/ranking'; 
import { GlobalStyles } from '@/app/constants/globalStyles';
import { Colors } from '@/app/constants/colors';
import { Job } from './jobCard';

interface BiddingModalProps {
  visible: boolean;
  job: Job | null;
  userId: string | null;
  onClose: () => void;
}

export const BiddingModal = ({ visible, job, userId, onClose }: BiddingModalProps) => {
  const [bidAmount, setBidAmount] = useState('');

  const handleSubmit = async () => {
    if (userId && job) {
      await trackEvent(userId, job.id, 'bid');
    }
    Alert.alert('Bid Sent!');
    setBidAmount('');
    onClose();
  };

  const handleClose = () => {
    setBidAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={GlobalStyles.modalOverlay}>
        <View style={styles.modalBox}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={24} color={Colors.textSubtle} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Place your bid</Text>
          <Text style={styles.modalSub}>{job?.title} • {job?.pay_amount}</Text>
          
          <View style={styles.inputContainer}> 
            <DollarSign size={20} color="white" />
            <TextInput
              style={styles.modalInput}
              placeholder="0.00"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="numeric"
              value={bidAmount}
              onChangeText={setBidAmount}
              autoFocus
            />
          </View>
          
          <TouchableOpacity
            style={GlobalStyles.primaryButton}
            onPress={handleSubmit}
          >
            <Text style={GlobalStyles.primaryButtonText}>Submit Bid</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBox: { backgroundColor: Colors.surface, padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%' },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 10 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: Colors.textMuted, fontSize: 15, marginBottom: 25 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceHighlight, borderRadius: 12, paddingHorizontal: 15, marginBottom: 25 },
  modalInput: { flex: 1, color: 'white', fontSize: 28, paddingVertical: 18, marginLeft: 10, fontWeight: 'bold' },
});