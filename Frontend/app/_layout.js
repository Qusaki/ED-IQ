import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { authService } from '../components/_authService';
import AuthScreen from './auth';
import { setupAxiosInterceptors } from './apiConfig';
import { useRBAC } from './RBACComponents';
import SplashAnimation from './SplashAnimation';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);
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

  if (!splashFinished) {
    return <SplashAnimation onFinish={() => setSplashFinished(true)} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      {!isAuthenticated ? (
        <AuthScreen onAuthSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="screens" />
          <Stack.Screen name="_ui" />
        </Stack>
      )}
    </>
  );
}