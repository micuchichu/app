import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface Switch {
  isEnabled: boolean;
  toggleSwitch: () => void;
}

export default function Switch({ isEnabled, toggleSwitch }: Switch) {
    const translateX = useRef(new Animated.Value(isEnabled ? 22 : 0)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: isEnabled ? 22 : 1,
            useNativeDriver: true,
            bounciness: 8,
            speed: 14,
        }).start();
    }, [isEnabled]);

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={toggleSwitch}>
            <View style={[styles.toggleTrack, { backgroundColor: isEnabled ? '#8b5cf6' : '#3f3f46', borderColor: isEnabled ? '#7c3aed' : '#27272a' }]}>
                <Animated.View style={[styles.toggleKnob, { transform: [{ translateX }] }]} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    toggleTrack: { width: 50, height: 28, borderRadius: 15, padding: 1.5, borderWidth: 1 },
    toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 }
});