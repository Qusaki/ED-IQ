import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useRBAC } from './RBACComponents';
import { authService } from '../components/_authService';
import Logo from '../assets/img/ED-IQ_LOGO.png';
import TeacherSubjects from './_ui/TeacherSubjects';
import StudentSubjects from './_ui/StudentSubjects';
import ChatbotModal from './ChatbotModal';

export default function HomeScreen() {
  const router = useRouter();
  const { userRole, isStudent, isTeacher, isAdmin } = useRBAC();
  const [user, setUser] = useState(null);
  const [chatbotVisible, setChatbotVisible] = useState(false);

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

  const getRoleDisplay = () => {
    if (isAdmin) return 'ADMIN INTERFACE';
    if (isTeacher) return 'TEACHER INTERFACE';
    return 'STUDENT INTERFACE';
  };

  const getRoleColor = () => {
    if (isAdmin) return '#dc3545';
    if (isTeacher) return '#28a745';
    return '#28a745';
  };

  // Render role-specific subject screens to match provided GUI
  if (isTeacher) {
    return (
      <>
        <TeacherSubjects />
        <ChatbotModal visible={chatbotVisible} onClose={() => setChatbotVisible(false)} />
      </>
    );
  }

  if (isTeacher === false && isStudent) {
    return (
      <>
        <StudentSubjects />
        <ChatbotModal visible={chatbotVisible} onClose={() => setChatbotVisible(false)} />
      </>
    );
  }

  // Fallback: original welcome view (e.g., for admin)
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => setChatbotVisible(true)}
          activeOpacity={0.7}
        >
          <Image 
            source={Logo}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>ED-IQ</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: getRoleColor() }]}>
          {getRoleDisplay()}
        </Text>
        <Text style={styles.welcomeText}>
          Welcome, {user?.name || 'User'}!
        </Text>
      </View>
      <ChatbotModal visible={chatbotVisible} onClose={() => setChatbotVisible(false)} />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 10,
    borderRadius: 15,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  brandText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 20,
  },
});
