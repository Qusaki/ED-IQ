import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Modal, TextInput, StyleSheet, Pressable, Alert, Image,
  TouchableOpacity,
  ImageBackground,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FABButton from '../../components/FABButton';
import CustomTabBar from '../../components/CustomTabBar';
import { useRBAC } from '../RBACComponents';
import { subjectService } from '../subjectService';
import { RBACManager, ROLES } from '../rbacManager';
import { useRouter, useFocusEffect } from 'expo-router';
import ChatbotModal from '../ChatbotModal';

const campusBackground = require('../../assets/background/prmsu-logo.png');

export default function TeacherSubjects() {
  const { isTeacher } = useRBAC();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [createdCode, setCreatedCode] = useState(null);
  const [chatbotVisible, setChatbotVisible] = useState(false);
  const [loading, setLoading] = useState(true);
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
      load(true);
    }, 30000); // 30 seconds polling


    return () => clearInterval(intervalId);
  }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const hasTeacher = await RBACManager.hasRole(ROLES.TEACHER);
      if (!hasTeacher) return Alert.alert('Access denied', 'Teacher role required');
      const data = await subjectService.listMySubjects();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const create = async () => {
    try {
      if (!name.trim()) return;
      setSubmitting(true);
      const subject = await subjectService.createSubject(name.trim());
      setCreatedCode(subject.code);
      setName('');
      setCreating(false);
      await load();
    } catch (e) {
      console.log('Create subject error:', e);
      Alert.alert('Create failed', e?.response?.data?.detail || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
  };

  const saveEdit = async () => {
    try {
      if (!editName.trim()) return;
      setSubmitting(true);
      await subjectService.updateSubject(editingSubject.id, editName.trim());
      setEditingSubject(null);
      setEditName('');
      await load();
    } catch (e) {
      Alert.alert('Edit failed', e?.response?.data?.detail || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (subjectId) => {
    Alert.alert(
      'Delete Subject',
      'Are you sure you want to delete this subject?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSubject(subjectId) }
      ]
    );
  };

  const showOptions = (item) => {
    Alert.alert(
      'Subject Options',
      'Choose an action for this subject',
      [
        { text: 'Edit', onPress: () => handleEdit(item) },
        { text: 'Delete', onPress: () => confirmDelete(item.id), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const deleteSubject = async (subjectId) => {
    try {
      setSubmitting(true);
      await subjectService.deleteSubject(subjectId);
      await load();
    } catch (e) {
      console.log('Delete subject error:', e);
      Alert.alert('Delete failed', e?.response?.data?.detail || e.message);
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
          <View style={[styles.bookHeader, { paddingRight: 48 }]}>
            <MaterialCommunityIcons name="book-education-outline" size={26} color="#E6B041" style={styles.bookIcon} />
            <Text style={styles.subjectTitle} numberOfLines={3}>{(item.name || 'Subject').toUpperCase()}</Text>
          </View>
          {!!item.code && (
            <View style={styles.codeContainer}>
              <Text style={styles.subjectMeta}>Class Code: {item.code}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => showOptions(item)}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#E6B041" />
          </TouchableOpacity>
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
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#003366" style={{ marginTop: 40 }} />
            ) : (
              <Text style={styles.empty}>No subjects yet</Text>
            )
          }
        />

        {isTeacher && (
          <FABButton bottom={120} onPress={() => setCreating(true)} color="#003366" iconColor="#E6B041" />
        )}

        <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Create Subject</Text>
              <TextInput
                placeholder="Subject name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoFocus
              />
              <View style={styles.row}>
                <Pressable style={[styles.btn, styles.cancel, styles.btnLeft]} onPress={() => setCreating(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.primary, styles.btnRight, (submitting || !name.trim()) && { opacity: 0.7 }]}
                  onPress={create}
                  disabled={submitting || !name.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Create</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={!!editingSubject} transparent animationType="slide" onRequestClose={() => setEditingSubject(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Edit Subject</Text>
              <TextInput
                placeholder="Subject name"
                value={editName}
                onChangeText={setEditName}
                style={styles.input}
                autoFocus
              />
              <View style={styles.row}>
                <Pressable style={[styles.btn, styles.cancel, styles.btnLeft]} onPress={() => setEditingSubject(null)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.primary, styles.btnRight, (submitting || !editName.trim()) && { opacity: 0.7 }]}
                  onPress={saveEdit}
                  disabled={submitting || !editName.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={!!createdCode} transparent animationType="fade" onRequestClose={() => setCreatedCode(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Share this code</Text>
              <Text style={styles.bigCode}>{createdCode}</Text>
              <Pressable style={[styles.btn, styles.primary]} onPress={() => setCreatedCode(null)}>
                <Text style={styles.btnText}>OK</Text>
              </Pressable>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: '#003366',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tooltipText: {
    color: '#E6B041',
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
    borderLeftColor: '#003366',
    marginLeft: -1,
    zIndex: 2,
  },
  bookCard: {
    backgroundColor: '#003366', // Inverted: Navy cover for teachers
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
    backgroundColor: '#E6B041', // Inverted: Golden spine for teachers
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(230, 176, 65, 0.3)',
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
    color: '#E6B041',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  codeContainer: {
    backgroundColor: 'rgba(230, 176, 65, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  subjectMeta: {
    color: '#E6B041',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  empty: { textAlign: 'center', marginTop: 40, color: '#6c757d' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#2c3e50' },
  input: {
    borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnLeft: { marginRight: 12 },
  btnRight: {},
  cancel: { backgroundColor: '#6c757d' },
  primary: { backgroundColor: '#003366' },
  btnText: { color: '#fff', fontWeight: '600' },
  bigCode: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#E6B041', marginVertical: 10 },
});