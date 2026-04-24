import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';

import JobCard, { Job } from '@/app/components/jobCard';
import { useAlert } from './alertContext';

interface JobPreviewModalProps {
  job: Job | null;
  onClose: () => void;
  userId: string | null;
}

export function JobPreviewModal({ job, onClose, userId }: JobPreviewModalProps) {
  const { showAlert } = useAlert();

  return (
    <Modal visible={!!job} animationType="fade" transparent={false}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        
        <TouchableOpacity 
          style={styles.closePreviewBtn} 
          onPress={onClose}
        >
          <X size={24} color="white" />
        </TouchableOpacity>
        
        {job && (
          <JobCard 
            item={job} 
            onApply={() => {
              showAlert("Apply", "Application flow goes here!");
            }} 
            userId={userId} 
            isActive={true}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closePreviewBtn: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 60 : 40, 
    left: 20, 
    zIndex: 100, 
    backgroundColor: 'rgba(24, 24, 27, 0.8)', 
    padding: 10, 
    borderRadius: 25, 
    borderWidth: 1, 
    borderColor: '#3f3f46' 
  }
});