import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { TokenManager } from '../components/_TokenManager';
import { authService } from '../components/_authService';
import CustomTabBar from '../components/CustomTabBar';

const DEFAULT_PROFILE = require('../assets/default_profile.jpg');

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Editable fields
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const result = await authService.getCurrentUser();
      if (result.success) {
        setUser(result.user);
        setNameValue(result.user.name || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const pickedAsset = result.assets[0];
      setImageLoading(true);

      // Get file extension from URI
      const uriParts = pickedAsset.uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1] || 'jpg';

      const updateResult = await authService.updateProfile({
        profilePicture: {
          uri: pickedAsset.uri,
          name: `profile_${Date.now()}.${fileExtension}`,
          type: pickedAsset.mimeType || `image/${fileExtension}`,
        },
      });

      if (updateResult.success) {
        setUser(updateResult.user);
        setImageError(false);
        Alert.alert('Success', 'Profile picture updated!');
      } else {
        Alert.alert('Error', updateResult.error || 'Failed to update profile picture.');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'An error occurred while picking the image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    if (nameValue.trim() === user?.name) {
      setEditingName(false);
      return;
    }

    setLoading(true);
    try {
      const result = await authService.updateProfile({ name: nameValue.trim() });
      if (result.success) {
        setUser(result.user);
        setEditingName(false);
        Alert.alert('Success', 'Name updated!');
      } else {
        Alert.alert('Error', result.error || 'Failed to update name.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Password cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.updateProfile({ password: newPassword });
      if (result.success) {
        setEditingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Password updated!');
      } else {
        Alert.alert('Error', result.error || 'Failed to update password.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              DeviceEventEmitter.emit('appLogout');
            } catch (error) {
              console.error('Logout error:', error);
              DeviceEventEmitter.emit('appLogout');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {imageLoading ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator size="large" color="#28a745" />
                </View>
              ) : imageError || !user?.profile_picture ? (
                <Image
                  source={DEFAULT_PROFILE}
                  style={styles.avatar}
                />
              ) : (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={styles.avatar}
                  onError={() => setImageError(true)}
                />
              )}
              <TouchableOpacity
                style={styles.editPhotoIcon}
                onPress={handlePickImage}
                disabled={imageLoading}
              >
                <Ionicons name="camera" size={16} color="#333" />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <Text style={styles.userRole}>
              {user?.role ? user.role.toUpperCase() : ''}
            </Text>
          </View>

          {/* Edit Fields Section */}
          <View style={styles.fieldsSection}>
            {/* Name Field */}
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Name</Text>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.textInput}
                    value={nameValue}
                    onChangeText={setNameValue}
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveName}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditingName(false);
                        setNameValue(user?.name || '');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.fieldValueRow}
                  onPress={() => setEditingName(true)}
                >
                  <Text style={styles.fieldValue}>
                    {user?.name || 'Tap to set name'}
                  </Text>
                  <Ionicons name="create" size={22} color="#2c3e50" />
                </TouchableOpacity>
              )}
            </View>

            {/* Student ID Field (for students only) */}
            {user?.role === 'student' && (
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Student ID</Text>
                <View style={styles.fieldValueRow}>
                  <Text style={styles.fieldValue}>{user?.student_id || '—'}</Text>
                </View>
              </View>
            )}

            {/* Email Field (read-only display) */}
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.fieldValueRow}>
                <Text style={styles.fieldValue}>{user?.email || '—'}</Text>
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Password</Text>
              {editingPassword ? (
                <View style={styles.editColumn}>
                  <TextInput
                    style={styles.textInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    secureTextEntry
                    autoFocus
                  />
                  <TextInput
                    style={[styles.textInput, { marginTop: 10 }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSavePassword}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.fieldValueRow}
                  onPress={() => setEditingPassword(true)}
                >
                  <Text style={styles.fieldValue}>••••••••</Text>
                  <Ionicons name="create" size={22} color="#2c3e50" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 140,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e9ecef',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#28a745',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  editPhotoPen: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c5ccd3',
    marginBottom: 4,
  },
  placeholderBody: {
    width: 60,
    height: 28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#c5ccd3',
  },
  userRole: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  fieldsSection: {
    marginBottom: 24,
  },
  fieldCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  editIcon: {
    fontSize: 18,
    color: '#6c757d',
    marginLeft: 8,
  },
  editRow: {
    gap: 10,
  },
  editColumn: {
    gap: 0,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});