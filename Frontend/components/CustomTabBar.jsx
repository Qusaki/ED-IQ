import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      name: 'index',
      icon: 'home',
      label: 'Home',
    },
    {
      name: 'notifications',
      icon: 'notifications',
      label: 'Notifications',
    },
    {
      name: 'profile',
      icon: 'person',
      label: 'Profile',
    },
  ];

  const handleTabPress = (tabName) => {
    console.log('Tab pressed:', tabName);
    console.log('Current pathname:', pathname);
    
    try {
      if (tabName === 'index') {
        router.navigate('/');
      } else {
        router.navigate(`/${tabName}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to push method
      if (tabName === 'index') {
        router.push('/');
      } else {
        router.push(`/${tabName}`);
      }
    }
  };

  const isActive = (tabName) => {
    if (tabName === 'index') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname === `/${tabName}`;
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={1}
          >
            <View style={[
              styles.iconContainer,
              active && styles.activeIconContainer
            ]}>
              <Ionicons
                name={tab.icon}
                size={24}
                color={active ? '#28a745' : '#6c757d'}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f4',
    borderTopWidth: 0,
    elevation: 8,
    height: 64,
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 24,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
  },
});
