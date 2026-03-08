import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FABButton({ onPress, icon = 'add', color = '#E6B041', iconColor = '#ffffff', centered = false, bottom = 100 }) {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { backgroundColor: color, bottom },
        centered ? styles.centered : null,
      ]}
      onPress={() => {
        try { console.log('FAB pressed'); } catch (_) { }
        if (onPress) onPress();
      }}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Add"
    >
      <View>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 1000,
  },
  centered: {
    right: undefined,
    left: '50%',
    marginLeft: -28,
  },
});