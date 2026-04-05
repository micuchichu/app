import React, { useRef, useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Animated, Dimensions, Platform, KeyboardAvoidingView
} from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import { RequestTab } from './request';
import { HireTab } from './hire';

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - 40;

export default function PostScreen() {
  const [activeTab, setActiveTab] = useState('hire');

  const scrollViewRef = useRef<ScrollViewType>(null);

  const scrollX = useRef(new Animated.Value(0)).current;

  const toggle = (tab : 'hire' | 'request') => {
    setActiveTab(tab);
    const isRequest = tab === 'request';
    scrollViewRef.current?.scrollTo({ x: isRequest ? contentWidth : 0, animated: true });
  };

  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = e.nativeEvent.contentOffset.x;

    const newTab = Math.round(offsetX / contentWidth) === 0 ? 'hire' : 'request';
    if (activeTab !== newTab) {
      setActiveTab(newTab);
    }
  };

  const tabIndicatorDistance = (contentWidth - 8) / 2;
  
  const indicatorTranslate = scrollX.interpolate({
    inputRange: [0, contentWidth],
    outputRange: [0, tabIndicatorDistance],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenHeader}>Create</Text>

      <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.toggleContainer}>
          <Animated.View
            style={[
              styles.toggleSlider,
              { transform: [{ translateX: indicatorTranslate }] },
            ]}
          />

          <TouchableOpacity style={styles.toggleBtn} onPress={() => toggle('hire')} activeOpacity={0.8}>
            <Text style={[styles.toggleText, activeTab === 'hire' && styles.toggleTextActive]}>Hire</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleBtn} onPress={() => toggle('request')} activeOpacity={0.8}>
            <Text style={[styles.toggleText, activeTab === 'request' && styles.toggleTextActive]}>Request</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
          >
            <View style={{ width: contentWidth - 10, marginRight: 5, marginLeft: 5 }}>
              <HireTab />
            </View>

            <View style={{ width: contentWidth - 10, marginRight: 5, marginLeft: 5 }}>
              <RequestTab />
            </View>

          </Animated.ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: 'black', paddingHorizontal: 20, paddingTop: 60 },
  screenHeader: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  // --- Toggle Styles ---
  toggleContainer: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 25, padding: 4, marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  toggleSlider: { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4, backgroundColor: '#8b5cf6', borderRadius: 21, width: '50%'},
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 21 },
  toggleBtnActive: { backgroundColor: '#8b5cf6' },
  toggleText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 14 },
  toggleTextActive: { color: 'white' },

  // --- Form Styles ---
  formSection: { flex: 1 },
  subHeader: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  uploadBox: { height: 160, backgroundColor: '#18181b', borderRadius: 15, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  uploadText: { color: '#71717a', marginTop: 10, fontWeight: '500' },
  inputLabel: { color: '#e4e4e7', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 10, width: '50%' },
  formInput: { backgroundColor: '#18181b', color: 'white', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#27272a' },
  
  // --- Pill/Switch Styles ---
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  pill: { backgroundColor: '#18181b', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  pillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  pillText: { color: '#a1a1aa', fontWeight: '600' },
  pillTextActive: { color: 'white' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25 },
  
  // --- Buttons ---
  primaryButton: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, width: '100%', alignSelf: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});