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
          console.error('Login Error:', result.error);
        }
      } else {
        const signupResult = await authService.signup(name, email, password, selectedRole, studentId);
        if (signupResult.success) {
          const loginResult = await authService.login(email, password);
          if (loginResult.success) {
            console.log('Signup and Login Success:', loginResult.user.name);
            if (onAuthSuccess) onAuthSuccess();
          } else {
            console.error('Signup Success, Login Failed:', loginResult.error);
            setIsLogin(true);
            clearForm();
          }
        } else {
          console.error('Signup Error:', signupResult.error);
        }
      }
    } catch (error) {
      console.error('Auth error (Global):', error);
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
                onChangeText={setEmail}
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
                  onChangeText={setPassword}
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

              {isLogin && (
                <TouchableOpacity style={styles.forgotPassword}>
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
      </SafeAreaView>
    </ImageBackground>
  );
}
