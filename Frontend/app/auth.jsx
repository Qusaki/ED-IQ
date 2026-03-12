// auth.jsx ito
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';


import { useRouter } from 'expo-router';
import { setupAxiosInterceptors } from './apiConfig';
import { styles } from './styles';
import { authService } from '../components/_authService';
import Logo from '../assets/img/ED-IQ_LOGO.png';
const campusBackground = require('../assets/background/prmsu-logo.png');

const roles = [
  { id: 'student', label: 'Student' },
  { id: 'teacher', label: 'Teacher' }
];

export default function AuthScreen({ onAuthSuccess, selectedRole: initialRole, onBack }) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedRole] = useState(initialRole || 'student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const isStudent = selectedRole === 'student';
  const themeColor = isStudent ? '#FF7700' : '#070975';

  // Initialize on component mount
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && (!name || (isStudent && !studentId)))) {
      console.log('Validation Error: Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await authService.login(email, password);
        if (result.success) {
          console.log('Login Success:', result.user.name);
          if (onAuthSuccess) onAuthSuccess();
        } else {
          setAuthError('Wrong email or password.');
          console.log('Login Error:', result.error);
        }
      } else {
        const signupResult = await authService.signup(name, email, password, selectedRole, studentId);
        if (signupResult.success) {
          const loginResult = await authService.login(email, password);
          if (loginResult.success) {
            console.log('Signup and Login Success:', loginResult.user.name);
            if (onAuthSuccess) onAuthSuccess();
          } else {
            console.log('Signup Success, Login Failed:', loginResult.error);
            setAuthError('Account created. Please sign in.');
            setIsLogin(true);
            clearForm();
          }
        } else {
          setAuthError('Signup failed. Try again.');
          console.log('Signup Error:', signupResult.error);
        }
      }
    } catch (error) {
      console.log('Auth error (Global):', error);
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setStudentId('');
    setIsLogin(true);
    setShowPassword(false);
  };

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      const result = await authService.forgotPassword(forgotEmail);
      if (result.success) {
        Alert.alert('Success', result.message || 'Check your email for a reset link');
        setShowForgotModal(false);
        setForgotEmail('');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
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
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#6c757d" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoContainer}>
              <Image
                source={Logo}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.brandText}>ED-IQ</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.title, { color: themeColor }]}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.subtitle}>
                {isStudent ? 'Student ' : 'Teacher '}
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>

              {!isLogin && (
                <TextInput
                  placeholder="Enter your name"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#999"
                />
              )}

              {isStudent && !isLogin && (
                <TextInput
                  placeholder="Enter your Student ID"
                  style={styles.input}
                  value={studentId}
                  onChangeText={setStudentId}
                  placeholderTextColor="#999"
                />
              )}

              <TextInput
                placeholder="Enter your email"
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setAuthError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Enter your password"
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setAuthError(''); }}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={[styles.eyeButton, showPassword && styles.flashlightOn]}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <View style={styles.flashlightContainer}>
                    <Text style={[styles.flashlightIcon, showPassword && styles.flashlightIconOn]}>
                      🔦
                    </Text>
                    {showPassword && (
                      <View style={styles.lightBeam}>
                        <Text style={styles.lightRays}>✨</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.flashlightText, showPassword && styles.flashlightTextOn]}>
                    {showPassword ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!!authError && (
                <Text style={{ color: '#dc3545', fontSize: 12, marginTop: -6, marginBottom: 0, marginLeft: 2 }}>
                  {authError}
                </Text>
              )}

              {isLogin && (
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => { setShowForgotModal(true); setForgotEmail(email); }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: themeColor }, loading && styles.disabledButton]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.authButtonText}>
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchContainer}
                onPress={() => setIsLogin(!isLogin)}
              >
                <Text style={styles.switchText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={[styles.switchLink, { color: themeColor }]}>
                    {isLogin ? "Sign Up" : "Sign In"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: 30 }]}>
              <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
                <Text style={[styles.modalTitle, { color: themeColor, fontSize: 24 }]}>Reset Password</Text>
                <TouchableOpacity 
                  onPress={() => setShowForgotModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6c757d" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              
              <TextInput
                placeholder="Ex. juandelacruz@gmail.com"
                style={styles.modalInput}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#adb5bd"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => { setShowForgotModal(false); setForgotEmail(''); }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalSubmitButton, { backgroundColor: themeColor }]}
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  <Text style={styles.modalSubmitButtonText}>
                    {forgotLoading ? 'Sending...' : 'Send Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}
