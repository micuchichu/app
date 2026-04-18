import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function InfoModal({ isVisible , onClose, title, description } : { isVisible: boolean, onClose: () => void, title: string, description?: string }) {
    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalText}>{description}</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Got it!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
} 

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#18181b', padding: 20, borderRadius: 12, width: '80%' },
    modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    modalText: { color: '#e4e4ec', fontSize: 14, marginBottom: 20 },
    closeButton: { backgroundColor: '#8b5cf6', padding: 12, borderRadius: 8, alignItems: 'center' },
    closeButtonText: { color: 'white', fontWeight: 'bold' },
});