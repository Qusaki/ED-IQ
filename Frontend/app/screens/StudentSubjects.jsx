import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Modal, TextInput, StyleSheet, Pressable, Alert, Image, TouchableOpacity, ImageBackground, Animated, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FABButton from '../../components/FABButton';
import CustomTabBar from '../../components/CustomTabBar';
import { useRBAC } from '../RBACComponents';
import { subjectService } from '../subjectService';
import { RBACManager, ROLES } from '../rbacManager';
import { useRouter, useFocusEffect } from 'expo-router';
import ChatbotModal from '../ChatbotModal';

const campusBackground = require('../../assets/background/prmsu-logo.png');

export default function StudentSubjects() {
  const { isStudent } = useRBAC();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [chatbotVisible, setChatbotVisible] = useState(false);
  const tooltipAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(5000), // Hide for 5 seconds
        Animated.timing(tooltipAnim, { toValue: 1, duration: 400, useNativeDriver: true }), // Pop in
        Animated.delay(5000), // Stay visible for 5 seconds
        Animated.timing(tooltipAnim, { toValue: 0, duration: 400, useNativeDriver: true }), // Pop out
        Animated.delay(100), // Small buffer
      ])
    ).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  // Background polling for real-time feel (every 3 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Silent load without triggering any loading states
      load();
    }, 10000); // 10 seconds polling

    return () => clearInterval(intervalId);
  }, []);

  const load = async () => {
    try {
      const hasStudent = await RBACManager.hasRole(ROLES.STUDENT);
      if (!hasStudent) return Alert.alert('Access denied', 'Student role required');
      const data = await subjectService.listMySubjects();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message);
    }
  };

  const join = async () => {
    try {
      if (!code.trim()) return;
      setSubmitting(true);
      await subjectService.joinByCode(code.trim().toUpperCase());
      setCode('');
      setJoining(false);
      await load();
    } catch (e) {
      Alert.alert('Join failed', e?.response?.data?.detail || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.cardTouchable}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: '/screens/SubjectDetail',
        params: {
          subjectId: item.id,
          subjectName: item.name || 'Subject'
        }
      })}
    >
      <View style={styles.bookCard}>
        {/* Book Spine */}
        <View style={styles.bookSpine} />

        <View style={styles.bookContent}>
          {/* Decorative Bookmark Ribbon */}
          <Ionicons
            name="bookmark"
            size={40}
            color="#003366"
            style={{ position: 'absolute', top: -4, right: 32, zIndex: 10 }}
          />
          <View style={styles.bookHeader}>
            <MaterialCommunityIcons name="book-education-outline" size={26} color="#003366" style={styles.bookIcon} />
            <Text style={styles.subjectTitle} numberOfLines={2}>{(item.name || 'Subject').toUpperCase()}</Text>
          </View>
          {(!!item.code || !!item.teacher_name) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              {!!item.teacher_name ? (
                <View style={styles.codeContainer}>
                  <Text style={[styles.subjectMeta, { fontWeight: 'bold' }]}>Instructor: {item.teacher_name}</Text>
                </View>
              ) : <View />}
              {!!item.code && (
                <Text style={[styles.subjectMeta, { fontSize: 11, fontStyle: 'italic', opacity: 0.9 }]}>
                  Code: {item.code}
                </Text>
              )}
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
      <View style={styles.overlay} />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerBrand}>ED-IQ</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../assets/Gif Logo/Logo_Animaation.gif')}
              style={styles.headerMascot}
              resizeMode="contain"
            />
            <Animated.View style={[
              styles.tooltipContainer,
              {
                opacity: tooltipAnim,
                transform: [
                  { translateX: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                  { scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }
                ]
              }
            ]}>
              <View style={styles.tooltipBubble}>
                <Text style={styles.tooltipText}>Need Help?</Text>
              </View>
              <View style={styles.tooltipTriangle} />
            </Animated.View>
            <TouchableOpacity
              onPress={() => setChatbotVisible(true)}
              style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]}
            />
          </View>
        </View>
        <FlatList
          data={subjects}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 200 }}
          ListEmptyComponent={<Text style={styles.empty}>No subjects yet</Text>}
        />

        {isStudent && (
          <FABButton bottom={120} onPress={() => setJoining(true)} />
        )}

        <Modal visible={joining} transparent animationType="slide" onRequestClose={() => setJoining(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Join by Code</Text>
              <TextInput
                placeholder="Enter subject code"
                value={code}
                onChangeText={setCode}
                style={styles.input}
                autoCapitalize="characters"
                maxLength={8}
                autoFocus
              />
              <View style={styles.row}>
                <Pressable style={[styles.btn, styles.cancel, styles.btnLeft]} onPress={() => setJoining(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.primary, styles.btnRight, (submitting || !code.trim()) && { opacity: 0.7 }]}
                  onPress={join}
                  disabled={submitting || !code.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Join</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <ChatbotModal visible={chatbotVisible} onClose={() => setChatbotVisible(false)} />
        <CustomTabBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  container: { flex: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8, marginBottom: 16 },
  headerBrand: { fontSize: 24, fontWeight: 'bold', fontFamily: 'sans-serif', color: '#2ecc71', letterSpacing: 1 },
  logoButton: { padding: 8 },
  headerMascot: { width: 56, height: 56 },
  tooltipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    position: 'absolute',
    right: 56,
  },
  tooltipBubble: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tooltipText: {
    color: '#003366',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tooltipTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 6,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFC107',
    marginLeft: -1,
    zIndex: 2,
  },
  bookCard: {
    backgroundColor: '#FFC107', // Cover color
    borderRadius: 8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'stretch', // ensures spine fills height
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#e8ecef', // Emulates white pages
    marginHorizontal: 4, // Make room for shadows and border
  },
  bookSpine: {
    width: 14,
    backgroundColor: '#003366', // Darker navy for spine
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.15)',
  },
  bookContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookIcon: {
    marginRight: 8,
    opacity: 0.9,
  },
  subjectTitle: {
    color: '#003366',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  codeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  subjectMeta: {
    color: '#003366',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', // horizontally center vertically with cover
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  empty: { textAlign: 'center', marginTop: 40, color: '#6c757d' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#003366' },
  input: {
    borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff', textAlign: 'center', letterSpacing: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnLeft: { marginRight: 12 },
  btnRight: {},
  cancel: { backgroundColor: '#6c757d' },
  primary: { backgroundColor: '#E6B041' },
  btnText: { color: '#fff', fontWeight: '600' },
});