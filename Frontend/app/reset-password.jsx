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
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const showMatchStatus = confirmPassword.length > 0;

  const handleResetPassword = async () => {
    if (!token) {
      Alert.alert('Error', 'Invalid or missing reset token.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.resetPassword(token, newPassword);
      if (result.success) {
        setIsSuccess(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to reset password.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
        <View style={styles.backgroundOverlay} />
        <SafeAreaView style={[styles.container, styles.authContainer, { justifyContent: 'center' }]}>
          <View style={styles.card}>
            <Ionicons name="checkmark-circle" size={80} color="#28a745" style={{ alignSelf: 'center', marginBottom: 20 }} />
            <Text style={[styles.title, { color: '#003366' }]}>Password Reset</Text>
            <Text style={[styles.subtitle, { marginBottom: 30 }]}>Your password has been successfully changed. Please go back to the app to log in.</Text>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: '#003366' }]}
              onPress={() => router.replace('/auth')}
            >
              <Text style={styles.authButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
      <View style={styles.backgroundOverlay} />
      <SafeAreaView style={[styles.container, styles.authContainer]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={[styles.title, { color: '#003366' }]}>Set New Password</Text>
              <Text style={styles.subtitle}>Create a strong password to protect your account.</Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="New Password"
                  style={styles.passwordInput}
                  secureTextEntry={true}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Confirm New Password"
                  style={styles.passwordInput}
                  secureTextEntry={true}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#999"
                />
              </View>

              {showMatchStatus && (
                <Text style={[
                  styles.validationMessage,
                  passwordsMatch ? styles.matchText : styles.mismatchText
                ]}>
                  {passwordsMatch ? 'Match' : 'mismatch password'}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: '#003366' }, (loading || !passwordsMatch) && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={loading || !passwordsMatch}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.authButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
