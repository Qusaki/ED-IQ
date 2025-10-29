import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { authService } from './authService';
import AuthScreen from './auth';
import { setupAxiosInterceptors } from './apiConfig';
import { useRBAC } from './RBACComponents';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isTeacher, isStudent } = useRBAC();

  useEffect(() => {
    setupAxiosInterceptors();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication status...');
      const result = await authService.getCurrentUser();
      const authStatus = result.success && result.user;
      console.log('Auth check result:', authStatus, result);
      setIsAuthenticated(authStatus);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 18, color: '#2c3e50' }}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen 
        onAuthSuccess={async () => {
          console.log('Auth success callback triggered');
          // Force a fresh authentication check
          await checkAuth();
        }} 
      />
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#28a745',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          animation: 'none',
          animationTypeForReplace: 'push',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Home',
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen 
          name="auth" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="apiConfig" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="RBACComponents" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="rbacManager" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="styles" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="subjectService" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="contentService" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="protectedRequestService" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="TokenManager" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen
          name="screens/SubjectDetail"
          options={{
            title: 'Subject Detail',
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="screens/TeacherSubjects"
          options={{
            title: 'Teacher Subjects',
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="screens/StudentSubjects"
          options={{
            title: 'Student Subjects',
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen 
          name="_ui" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="components" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="assets" 
          options={{ 
            href: null
          }} 
        />
        <Stack.Screen 
          name="authService" 
          options={{ 
            href: null
          }} 
        />
      </Stack>
    </>
  );
}


// Intentionally simple icons to match provided design

