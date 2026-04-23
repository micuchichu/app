import { StyleSheet, Platform } from 'react-native';
import { Colors } from './colors';

export const GlobalStyles = StyleSheet.create({
  safeScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  paddedScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 60,
  },

  headerText: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subHeaderText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginBottom: 15,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },

  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: 18,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceHighlight,
  },

  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});