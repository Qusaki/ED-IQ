import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Modal, TextInput, StyleSheet, Pressable, Alert, Image, TouchableOpacity } from 'react-native';
import FABButton from '../../components/FABButton';
import CustomTabBar from '../../components/CustomTabBar';
import { useRBAC } from '../RBACComponents';
import { subjectService } from '../subjectService';
import { RBACManager, ROLES } from '../rbacManager';
import { useRouter } from 'expo-router';

export default function TeacherSubjects() {
  const { isTeacher } = useRBAC();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [createdCode, setCreatedCode] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const hasTeacher = await RBACManager.hasRole(ROLES.TEACHER);
      if (!hasTeacher) return Alert.alert('Access denied', 'Teacher role required');
      const data = await subjectService.listMySubjects();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message);
    }
  };

  const create = async () => {
    try {
      if (!name.trim()) return;
      const subject = await subjectService.createSubject(name.trim());
      setCreatedCode(subject.code);
      setName('');
      setCreating(false);
      await load();
    } catch (e) {
      Alert.alert('Create failed', e?.response?.data?.detail || e.message);
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerBrand}>ED-IQ</Text>
        <Image source={require('../../assets/img/ED-IQ_LOGO.png')} style={styles.headerMascot} resizeMode="contain" />
      </View>
      <FlatList
        data={subjects}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 200 }}
        ListEmptyComponent={<Text style={styles.empty}>No subjects yet</Text>}
      />

      {isTeacher && (
        <FABButton bottom={120} onPress={() => setCreating(true)} />
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
              <Pressable style={[styles.btn, styles.primary, styles.btnRight]} onPress={create}>
                <Text style={styles.btnText}>Create</Text>
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
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 42, paddingBottom: 8, marginBottom: 16 },
  headerBrand: { fontSize: 24, fontWeight: '900', color: '#28a745', letterSpacing: 1 },
  headerMascot: { width: 56, height: 56 },

  subjectWrapper: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#cde9ce' },
  subjectRow: { flexDirection: 'row', alignItems: 'center' },
  subjectThumb: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#d6f0ff', marginRight: 12 },
  subjectBar: { flex: 1, backgroundColor: '#0f7a67', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 14 },
  subjectTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  subjectMeta: { marginTop: 8, color: '#28a745', fontWeight: '600', paddingLeft: 4 },

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
  primary: { backgroundColor: '#28a745' },
  btnText: { color: '#fff', fontWeight: '600' },
  bigCode: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#28a745', marginVertical: 10 },
});


