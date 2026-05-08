import { Colors } from '@/constants/colors';
import { ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

export const DatePickerModal = ({ visible, date, onClose, onChange }: any) => {
  const [currentMonth, setCurrentMonth] = useState(date.toISOString().split('T')[0]);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  
  const contentOpacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setCurrentMonth(date.toISOString().split('T')[0]);
      setShowYearPicker(false);
      
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(modalOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      modalOpacityAnim.setValue(0);
    }
  }, [visible, date]);

  const switchViewWithAnimation = (action: () => void) => {
    Animated.timing(contentOpacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      action();
      Animated.timing(contentOpacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  const toggleYearPicker = () => {
    switchViewWithAnimation(() => setShowYearPicker(!showYearPicker));
  };

  const handleYearSelect = (year: number) => {
    switchViewWithAnimation(() => {
      const newDateStr = `${year}-${currentMonth.substring(5, 7)}-01`;
      setCurrentMonth(newDateStr);
      setShowYearPicker(false);
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        
        <Animated.View style={[styles.centerBox, { opacity: modalOpacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.headerControls}>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            
            <TouchableOpacity onPress={toggleYearPicker} style={styles.titleToggleBtn}>
               <Text style={styles.titleText}>{showYearPicker ? "Select Year" : "Select Date"}</Text>
               <ArrowRightLeft size={16} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onClose}><Text style={styles.doneText}>Done</Text></TouchableOpacity>
          </View>

          <Animated.View style={{ flex: 1, opacity: contentOpacityAnim }}>
            {showYearPicker ? (
              <View style={styles.yearPickerContainer}>
                <FlatList
                  data={years}
                  keyExtractor={(item) => item.toString()}
                  numColumns={3}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.yearButton} onPress={() => handleYearSelect(item)}>
                      <Text style={[styles.yearText, item === parseInt(currentMonth.substring(0,4)) && styles.yearTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              <Calendar
                current={currentMonth}
                onMonthChange={(month: any) => setCurrentMonth(month.dateString)}
                maxDate={new Date().toISOString().split('T')[0]}
                enableSwipeMonths={true}
                firstDay={1} // <-- ADDED: Starts the week on Monday (European standard)
                onDayPress={(day: any) => {
                  // --- FIXED: Construct a local date directly to bypass Daylight Saving Time offsets ---
                  const selected = new Date(day.year, day.month - 1, day.day);
                  onChange(selected);
                  onClose();
                }}
                renderHeader={(date: any) => (
                  <TouchableOpacity onPress={toggleYearPicker}>
                    <Text style={styles.calendarHeaderText}>{date.toString('MMMM yyyy')}</Text>
                  </TouchableOpacity>
                )}
                renderArrow={(direction: 'left' | 'right') => (
                  direction === 'left' ? <ChevronLeft size={24} color={Colors.primary} /> : <ChevronRight size={24} color={Colors.primary} />
                )}
                theme={{
                  backgroundColor: Colors.surface, calendarBackground: Colors.surface,
                  textSectionTitleColor: '#a1a1aa', selectedDayBackgroundColor: Colors.primary,
                  selectedDayTextColor: '#ffffff', todayTextColor: Colors.primary,
                  dayTextColor: 'white', textDisabledColor: '#3f3f46', monthTextColor: 'white',
                }}
              />
            )}
          </Animated.View>
        </Animated.View>
        
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  centerBox: { backgroundColor: Colors.surface, borderRadius: 20, overflow: 'hidden', paddingBottom: 10, minHeight: 400 },
  headerControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.surfaceHighlight },
  cancelText: { color: Colors.textMuted, fontSize: 16 },
  titleText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  doneText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  
  calendarHeaderText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  yearPickerContainer: { flex: 1, padding: 15 },
  yearButton: { flex: 1, alignItems: 'center', paddingVertical: 15, margin: 5, backgroundColor: Colors.surfaceHighlight, borderRadius: 10 },
  yearText: { color: 'white', fontSize: 18, fontWeight: '500' },
  yearTextActive: { color: Colors.primary, fontWeight: 'bold', fontSize: 20 },

  titleToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
});