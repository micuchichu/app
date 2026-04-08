import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function DashboardScreen() {
  return (
      <ScrollView style={styles.screenContainer}>
        
      </ScrollView>
  );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: 'black', paddingHorizontal: 20, paddingTop: 60 },
    screenHeader: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },

    
});