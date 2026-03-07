import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text, DeviceEventEmitter, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { authService } from '../components/_authService';
import AuthScreen from './auth';
import { setupAxiosInterceptors } from './apiConfig';
import { useRBAC } from './RBACComponents';
import SelectionScreen from './SelectionScreen';
import SplashAnimation from './SplashAnimation';
import { LoadingProvider, useLoading } from '../components/LoadingContext';

SplashScreen.preventAutoHideAsync().catch(() => { });

function GlobalLoadingOverlay() {
  const { isGlobalLoading } = useLoading();

  if (!isGlobalLoading) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#FF7700" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    </View>
  );
}

function RootLayoutContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);
  const [currentFlowStep, setCurrentFlowStep] = useState('selection'); // 'selection' or 'auth'
  const [selectedRole, setSelectedRole] = useState(null);
  const { isTeacher, isStudent } = useRBAC();

  useEffect(() => {
    setupAxiosInterceptors();
    checkAuth();

    const logoutListener = DeviceEventEmitter.addListener('appLogout', () => {
      setIsAuthenticated(false);
      setCurrentFlowStep('selection');
      setSelectedRole(null);
    });

    return () => {
      logoutListener.remove();
    };
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

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCurrentFlowStep('auth');
  };

  const handleBackToSelection = () => {
    setCurrentFlowStep('selection');
    setSelectedRole(null);
  };

  if (!splashFinished) {
    return <SplashAnimation onFinish={() => setSplashFinished(true)} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF7700" />
        <Text style={{ marginTop: 10 }}>ED-IQ is taking a moment...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <GlobalLoadingOverlay />
      {!isAuthenticated ? (
        currentFlowStep === 'selection' ? (
          <SelectionScreen onSelectRole={handleRoleSelect} />
        ) : (
          <AuthScreen
            onAuthSuccess={() => setIsAuthenticated(true)}
            selectedRole={selectedRole}
            onBack={handleBackToSelection}
          />
        )
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="profile" options={{ animation: 'fade' }} />
          <Stack.Screen name="notifications" options={{ animation: 'fade' }} />
          <Stack.Screen name="screens" options={{ animation: 'none' }} />
          <Stack.Screen name="_ui" />
        </Stack>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <LoadingProvider>
      <RootLayoutContent />
    </LoadingProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  }
});
