import React, { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import MapView from 'react-native-maps';
import { MapPin, LocateFixed, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAlert } from './alertContext';

export const MapPickerModal = ({ visible, region, onRegionChange, onClose, onConfirm }: any) => {
    const mapRef = useRef<MapView>(null);
    const [isLocating, setIsLocating] = React.useState(false);
    const { showAlert } = useAlert();

    const handleLocateMe = async () => {
        setIsLocating(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    
                mapRef.current?.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 1000); 
            } else {
              showAlert('Permission Denied', 'Please enable location permissions in your settings to use this feature.');
            }
        } catch (error) {
            console.log("Could not locate user", error);
        }
        setIsLocating(false);
    };

    return (
        <Modal visible={visible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <MapView 
                    ref={mapRef}
                    style={{ flex: 1 }} 
                    initialRegion={region} 
                    onRegionChangeComplete={onRegionChange} 
                    showsUserLocation={true} 
                    userInterfaceStyle="dark" 
                />
                
                <View style={styles.centerPinContainer} pointerEvents="none">
                    <MapPin size={40} color="#8b5cf6" fill="#18181b" style={{ bottom: 20 }} />
                </View>

                <TouchableOpacity 
                    style={styles.locateButton} 
                    onPress={handleLocateMe}
                    disabled={isLocating}
                    activeOpacity={0.7}
                >
                    {isLocating ? (
                        <ActivityIndicator size="small" color="black" />
                    ) : (
                        <LocateFixed size={24} color='#888888' strokeWidth={2.5} />
                    )}
                </TouchableOpacity>

                <View style={styles.mapBottomPanel}>
                    <Text style={styles.mapInstruction}>Pan the map to set location</Text>
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: '#3f3f46', marginTop: 15 }]} onPress={onClose}>
                            <Text style={styles.submitBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.primaryButton, { flex: 2, marginTop: 15 }]} onPress={onConfirm}>
                            <Text style={styles.submitBtnText}>Confirm Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centerPinContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20, zIndex: 10 },
    mapBottomPanel: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#18181b', padding: 25, paddingBottom: 40, borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 10 },
    mapInstruction: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    
    primaryButton: { backgroundColor: '#8b5cf6', padding: 18, borderRadius: 12, alignItems: 'center', width: '100%', alignSelf: 'center' },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    locateButton: {
        position: 'absolute',
        bottom: 170,
        right: 20,
        backgroundColor: '#18181b',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    }
});