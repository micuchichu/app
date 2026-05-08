// app/components/mapPickerModal.tsx
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export const MapPickerModal = ({ visible, onClose }: any) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000088' }}>
        <View style={{ backgroundColor: '#18181b', padding: 20, borderRadius: 12, width: '85%' }}>
          <Text style={{ color: 'white', fontSize: 16, marginBottom: 12 }}>
            Map picker is not available on web.
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#8b5cf6' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};