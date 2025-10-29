import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import CustomTabBar from '../components/CustomTabBar';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NOTIFICATIONS</Text>
        
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Welcome to ED-IQ! Your account has been created successfully.</Text>
            <Text style={styles.notificationTime}>Just now</Text>
          </View>
          
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>New course available: Introduction to React Native</Text>
            <Text style={styles.notificationTime}>2 hours ago</Text>
          </View>
          
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Assignment due tomorrow: Final Project Submission</Text>
            <Text style={styles.notificationTime}>1 day ago</Text>
          </View>
          
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Your grade for Module 3 has been posted</Text>
            <Text style={styles.notificationTime}>2 days ago</Text>
          </View>
        </ScrollView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#32cd32',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  notificationText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 22,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});
