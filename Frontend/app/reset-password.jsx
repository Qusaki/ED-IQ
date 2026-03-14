import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { authService } from '../components/_authService';

const campusBackground = require('../assets/background/prmsu-logo.png');

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!token) {
      Alert.alert('Error', 'Invalid or missing reset token.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.resetPassword(token, newPassword);
      if (result.success) {
        Alert.alert('Success', 'Your password has been updated successfully.', [
          { text: 'Login now', onPress: () => router.replace('/auth') }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to reset password.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
      <View style={styles.backgroundOverlay} />
      <SafeAreaView style={[styles.container, styles.authContainer]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableOpacity onPress={() => router.replace('/auth')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#6c757d" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={[styles.title, { color: '#003366' }]}>Set New Password</Text>
              <Text style={styles.subtitle}>Create a strong password to protect your account.</Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="New Password"
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#6c757d" />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Confirm New Password"
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: '#003366' }, loading && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.authButtonText}>Save</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchContainer}
                onPress={() => router.replace('/auth')}
              >
                <Text style={styles.switchText}>
                  Back to <Text style={[styles.switchLink, { color: '#003366' }]}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
