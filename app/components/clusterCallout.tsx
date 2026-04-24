import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/app/constants/colors';

export default function ClusterCallout({ cluster }: { cluster: any }) {
  const displayJobs = cluster.jobs.slice(0, 5);
  const remaining = cluster.jobs.length - 5;

  return (
    <View style={styles.calloutContainer}>
      <Text style={styles.calloutHeader}>{cluster.jobs.length} Jobs in this area</Text>
      
      {displayJobs.map((job: any) => (
        <View key={job.id} style={styles.jobRow}>
          <View style={styles.dot} />
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.jobPay}>${job.pay_amount}</Text>
        </View>
      ))}

      {remaining > 0 && (
        <Text style={styles.moreText}>And {remaining} more...</Text>
      )}
      
      <Text style={styles.hintText}>Tap here to zoom in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  calloutContainer: { backgroundColor: '#18181b', borderRadius: 16, padding: 15, width: 220, borderWidth: 1, borderColor: '#27272a', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 8, marginBottom: 10 },
  calloutHeader: { color: Colors.primary || '#8b5cf6', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  jobRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 8 },
  jobTitle: { color: 'white', fontSize: 14, flex: 1, marginRight: 10, fontWeight: '500' },
  jobPay: { color: '#a1a1aa', fontSize: 13, fontWeight: 'bold' },
  moreText: { color: '#71717a', fontSize: 12, fontStyle: 'italic', marginTop: 4, marginLeft: 14 },
  hintText: { color: '#52525b', fontSize: 10, textAlign: 'center', marginTop: 10 },
});