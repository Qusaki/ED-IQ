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

export default function AuthScreen({ onAuthSuccess }) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize on component mount
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && (!name || !selectedRole))) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await authService.login(email, password);
        if (result.success) {
          Alert.alert('Login Success', `Welcome back ${result.user.name}!`);
          // Call the success callback to update the layout immediately
          if (onAuthSuccess) onAuthSuccess();
        } else {
          Alert.alert('Login Error', result.error);
        }
      } else {
        // Handle signup - create account and automatically log in
        const signupResult = await authService.signup(name, email, password, selectedRole);
        if (signupResult.success) {
          // Automatically log in after successful signup
          const loginResult = await authService.login(email, password);
          if (loginResult.success) {
            Alert.alert('Success!', `Welcome to ED-IQ, ${loginResult.user.name}! Your account has been created and you are now logged in.`);
            // Call the success callback to update the layout immediately
            if (onAuthSuccess) onAuthSuccess();
          } else {
            Alert.alert('Signup Success, Login Failed', 'Account created but automatic login failed. Please log in manually.');
            setIsLogin(true);
            clearForm();
          }
        } else {
          Alert.alert('Signup Error', signupResult.error);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRole('');
    setIsLogin(true);
    setShowPassword(false);
  };

  const selectRole = (role) => {
    setSelectedRole(role.id);
    setShowRolePicker(false);
  };

  const renderRoleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roleItem}
      onPress={() => selectRole(item)}
    >
      <Text style={styles.roleItemText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
      <View style={styles.backgroundOverlay} />
      <SafeAreaView style={[styles.container, styles.authContainer]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
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
              <Text style={styles.title}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Sign in to your account' : 'Sign up to get started'}
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

              {!isLogin && (
                <TouchableOpacity
                  style={styles.roleSelector}
                  onPress={() => setShowRolePicker(true)}
                >
                  <Text style={[styles.roleSelectorText, !selectedRole && styles.placeholder]}>
                    {selectedRole ? roles.find(r => r.id === selectedRole)?.label : 'Enter your role'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              )}

              {isLogin && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.authButton, loading && styles.disabledButton]}
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
                  <Text style={styles.switchLink}>
                    {isLogin ? "Sign Up" : "Sign In"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={showRolePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRolePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your Role</Text>
                <TouchableOpacity
                  onPress={() => setShowRolePicker(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={roles}
                renderItem={renderRoleItem}
                keyExtractor={(item) => item.id}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}