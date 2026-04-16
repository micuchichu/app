import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import DatePicker from 'react-native-date-picker'; 
import { Colors } from '../constants/colors';

interface DatePickerModalProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onChange: (selectedDate: Date) => void; 
}

export const DatePickerModal = ({ visible, date, onClose, onChange }: DatePickerModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Birth Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pickerContainer}>
            <DatePicker
              date={date}
              onDateChange={onChange}
              mode="date"
              theme="dark"
              maximumDate={new Date()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHighlight,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  doneText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    paddingTop: 10,
    alignItems: 'center',
  },
});