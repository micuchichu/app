import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAlert } from '@/components/alertContext';
import { Job } from '@/components/jobCard';
import { Colors } from '@/constants/colors';
import { trackEvent } from '@/lib/ranking';
import { supabase } from '@/lib/supabase';

interface BiddingModalProps {
  visible: boolean;
  job: Job | null;
  userId: string | null;
  onClose: () => void;
}

export const BiddingModal = ({ visible, job, userId, onClose }: BiddingModalProps) => {
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useAlert();

  const handleClose = () => {
    setBidAmount('');
    onClose();
  };

  const submitBid = async () => {
    if (!userId || !job) {
      showAlert("Error", "You must be logged in to bid.");
      return;
    }

    const cleanBid = parseFloat(bidAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanBid) || cleanBid <= 0) {
      showAlert("Invalid Amount", "Please enter a valid bid amount.");
      return;
    }

    setIsSubmitting(true);

    const { data: existingEmployee, error: empFetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (empFetchError) {
      setIsSubmitting(false);
      showAlert("Database Error", "Could not verify your profile.");
      return;
    }

    if (!existingEmployee) {
      const { error: insertEmpError } = await supabase
        .from('employees')
        .insert([{ 
          id: userId, 
          rating: 0, 
          looking_for_job: true, 
          active_user: true, 
          jobs_done: 0 
        }]); 

      if (insertEmpError) {
        setIsSubmitting(false);
        showAlert("Profile Error", "Could not initialize your worker profile.");
        return;
      }
    }

    const { error } = await supabase
      .from('job_postings_candidates')
      .insert({
        job_id: job.id,
        employee_id: userId,
        pay_bidded: cleanBid 
      });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        showAlert('Already Applied', 'You have already submitted a bid for this job.');
      } else {
        console.error("Bid error:", error);
        showAlert('Error', 'Could not submit your bid. Please try again.');
      }
    } else {
      await trackEvent(userId, job.id, 'apply');
      const currencyCode = job.currencies?.currency_text || '';
      
      handleClose();
      showAlert('Bid Submitted!', `Your bid of ${cleanBid} ${currencyCode} has been sent successfully.`);
    }
  };

  if (!job) return null;

  const currencyCode = job.currencies?.currency_text || '';

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalCard}>
          
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Place a Bid</Text>
              <Text style={styles.subtitle}>Negotiate your pay for this job</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={isSubmitting}>
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle} numberOfLines={1}>{job.title}</Text>
            <Text style={styles.infoSub}>Employer's Budget: {job.pay_amount} {currencyCode}</Text>
          </View>

          <Text style={styles.inputLabel}>Your Proposed Offer</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50.00"
              placeholderTextColor="#71717a"
              keyboardType="numeric"
              value={bidAmount}
              onChangeText={setBidAmount}
              editable={!isSubmitting}
              autoFocus
            />
            <Text style={styles.currencyBadge}>{currencyCode}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={submitBid} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Bid</Text>
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#27272a' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 4 },
  closeBtn: { backgroundColor: '#27272a', padding: 8, borderRadius: 20 },
  
  infoBox: { backgroundColor: '#27272a', padding: 15, borderRadius: 12, marginBottom: 25 },
  infoTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  infoSub: { color: '#4ade80', fontSize: 14, fontWeight: '600' },
  
  inputLabel: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000000', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 16, paddingHorizontal: 15, marginBottom: 30 },
  input: { flex: 1, color: 'white', fontSize: 20, paddingVertical: 18, fontWeight: 'bold' },
  currencyBadge: { color: '#a1a1aa', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  
  submitBtn: { backgroundColor: Colors.primary || '#8b5cf6', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});