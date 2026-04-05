import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { styles } from './post/post';

export default function ProfileScreen() {
  return (
      <ScrollView style={styles.screenContainer}>

        
        <Text style={{color: 'white'}}>Profile Stuff</Text>
      </ScrollView>
  );
}