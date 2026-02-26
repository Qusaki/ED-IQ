import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Modal, TextInput, StyleSheet, Pressable, Alert, Image, TouchableOpacity, ImageBackground } from 'react-native';
import FABButton from '../../components/FABButton';
import CustomTabBar from '../../components/CustomTabBar';
import { useRBAC } from '../RBACComponents';
import { subjectService } from '../subjectService';
import { RBACManager, ROLES } from '../rbacManager';
import { useRouter } from 'expo-router';
import ChatbotModal from '../ChatbotModal';

const campusBackground = require('../../assets/background/prmsu-logo.png');

export default function StudentSubjects() {
  const { isStudent } = useRBAC();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [chatbotVisible, setChatbotVisible] = useState(false);

  useEffect(() => {
    load();
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
      await subjectService.joinByCode(code.trim().toUpperCase());
      setCode('');
      setJoining(false);
      await load();
    } catch (e) {
      Alert.alert('Join failed', e?.response?.data?.detail || e.message);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.subjectWrapper}
      onPress={() => router.push({
        pathname: '/screens/SubjectDetail',
        params: { 
          subjectId: item.id, 
          subjectName: item.name || 'Subject' 
        }
      })}
    >
      <View style={styles.subjectRow}>
        <View style={styles.subjectThumb} />
        <View style={styles.subjectBar}>
          <Text style={styles.subjectTitle}>{(item.name || 'Subject').toUpperCase()}</Text>
        </View>
      </View>
      {!!item.code && <Text style={styles.subjectMeta}>Code: {item.code}</Text>}
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
      <View style={styles.overlay} />
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerBrand}>ED-IQ</Text>
        <TouchableOpacity
          onPress={() => setChatbotVisible(true)}
          style={styles.logoButton}
        >
          <Image source={require('../../assets/img/ED-IQ_LOGO.png')} style={styles.headerMascot} resizeMode="contain" />
        </TouchableOpacity>
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
              <Pressable style={[styles.btn, styles.primary, styles.btnRight]} onPress={join}>
                <Text style={styles.btnText}>Join</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 42, paddingBottom: 8, marginBottom: 16 },
  headerBrand: { fontSize: 24, fontWeight: '900', color: '#28a745', letterSpacing: 1 },
  logoButton: { padding: 8 },
  headerMascot: { width: 56, height: 56 },

  subjectWrapper: { backgroundColor: '#fff3cd', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ffe8a1' },
  subjectRow: { flexDirection: 'row', alignItems: 'center' },
  subjectThumb: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#d6f0ff', marginRight: 12 },
  subjectBar: { flex: 1, backgroundColor: '#0f7a67', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 14 },
  subjectTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  subjectMeta: { marginTop: 8, color: '#fd7e14', fontWeight: '600', paddingLeft: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#6c757d' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#2c3e50' },
  input: {
    borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff', textAlign: 'center', letterSpacing: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnLeft: { marginRight: 12 },
  btnRight: {},
  cancel: { backgroundColor: '#6c757d' },
  primary: { backgroundColor: '#28a745' },
  btnText: { color: '#fff', fontWeight: '600' },
});