import { Colors } from '@/constants/colors';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

export interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}

export const AlertModal = ({ visible, title, message, onClose, buttonText = "OK" }: AlertModalProps) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.alertBox}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20, },
  alertBox: { backgroundColor: Colors.surface || '#18181b', padding: 25, borderRadius: 20, width: '100%', maxWidth: 350, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a', },
  
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', },
  message: { color: Colors.textSubtle || '#a1a1aa', fontSize: 16, marginBottom: 25, textAlign: 'center', lineHeight: 22, },
  
  button: { backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
});