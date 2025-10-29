import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { TokenManager } from './TokenManager';
import { authService } from './authService';
import CustomTabBar from '../components/CustomTabBar';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const result = await authService.getCurrentUser();
      if (result.success) {
        setUser(result.user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              // Force a page reload to trigger the layout authentication check
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }, 500);
            } catch (error) {
              console.error('Logout error:', error);
              // Force a page reload to trigger the layout authentication check
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }, 500);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.userIcon}>
            <View style={styles.userHead} />
            <View style={styles.userShoulders} />
          </View>
          
          <Text style={styles.userName}>
            {user?.name || 'NAME OF USER'}
          </Text>
          <Text style={styles.userRole}>
            {user?.role ? user.role.toUpperCase() : 'ROLE OF USER'}
          </Text>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={loadUserData}>
            <Text style={styles.actionButtonText}>Refresh Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingBottom: 120, // Add padding to avoid navigation bar overlap
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIcon: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userHead: {
    width: 80,
    height: 80,
    backgroundColor: '#2c3e50',
    borderRadius: 40,
    marginBottom: 10,
  },
  userShoulders: {
    width: 100,
    height: 40,
    backgroundColor: '#2c3e50',
    borderRadius: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 18,
    color: '#2c3e50',
    textAlign: 'center',
  },
  actionsSection: {
    width: '100%',
    paddingBottom: 20,
  },
  actionButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
