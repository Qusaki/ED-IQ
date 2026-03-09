import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRBAC } from '../RBACComponents';

export default function SubjectDetail() {
  const { isTeacher } = useRBAC();
  const router = useRouter();
  const { subjectId, subjectName } = useLocalSearchParams();

  const [enrolledStudents, setEnrolledStudents] = useState([
    { id: 1, name: 'John Doe', status: 'enrolled' },
    { id: 2, name: 'Jane Smith', status: 'enrolled' },
    { id: 3, name: 'Mike Johnson', status: 'enrolled' },
  ]);

  const [pendingStudents, setPendingStudents] = useState([
    { id: 4, name: 'Sarah Wilson', status: 'pending' },
    { id: 5, name: 'David Brown', status: 'pending' },
  ]);

  const [acceptingStudentId, setAcceptingStudentId] = useState(null);
  const [rejectingStudentId, setRejectingStudentId] = useState(null);

  const handleAccept = async (studentId) => {
    const student = pendingStudents.find(s => s.id === studentId);
    if (student) {
      try {
        setAcceptingStudentId(studentId);
        // Move from pending to enrolled
        setPendingStudents(prev => prev.filter(s => s.id !== studentId));
        setEnrolledStudents(prev => [...prev, { ...student, status: 'enrolled' }]);
      } catch (error) {
        Alert.alert('Error', 'Failed to accept student');
      } finally {
        setAcceptingStudentId(null);
      }
    }
  };

  const handleReject = (studentId) => {
    const student = pendingStudents.find(s => s.id === studentId);
    if (student) {
      Alert.alert(
        'Reject Student',
        `Are you sure you want to reject ${student.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              try {
                setRejectingStudentId(studentId);
                setPendingStudents(prev => prev.filter(s => s.id !== studentId));
                Alert.alert('Rejected', `${student.name} has been rejected`);
              } catch (error) {
                Alert.alert('Error', 'Failed to reject student');
              } finally {
                setRejectingStudentId(null);
              }
            }
          }
        ]
      );
    }
  };

  const renderEnrolledStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentIcon}>
        <Ionicons name="person" size={20} color="#000" />
      </View>
      <Text style={styles.studentName}>{item.name}</Text>
    </View>
  );

  const renderPendingStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentIcon}>
        <Ionicons name="person" size={20} color="#000" />
      </View>
      <Text style={styles.studentName}>{item.name}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
          disabled={rejectingStudentId === item.id || acceptingStudentId === item.id}
        >
          {rejectingStudentId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="close" size={16} color="#fff" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
          disabled={rejectingStudentId === item.id || acceptingStudentId === item.id}
        >
          {acceptingStudentId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#E6B041" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subjectName || 'Subject Detail'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ENROLLED Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>ENROLLED</Text>
        <View style={styles.sectionContent}>
          <FlatList
            data={enrolledStudents}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderEnrolledStudent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No enrolled students</Text>
            }
          />
        </View>
      </View>

      {/* CLASS LIST Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>CLASS LIST</Text>
        <View style={styles.sectionContent}>
          <FlatList
            data={pendingStudents}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPendingStudent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No pending enrollments</Text>
            }
          />
        </View>
      </View>

      {/* Bottom Navigation - Special navigation for subject detail */}
      <View style={styles.subjectTabBar}>
        <TouchableOpacity style={[styles.subjectTabItem, styles.activeTab]}>
          <View style={styles.subjectIconContainer}>
            <Ionicons name="school" size={24} color="#E6B041" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subjectTabItem}>
          <View style={styles.subjectIconContainer}>
            <Ionicons name="add" size={24} color="#E6B041" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subjectTabItem}>
          <View style={styles.subjectIconContainer}>
            <Ionicons name="notifications" size={24} color="#E6B041" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 8,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E6B041',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E6B041',
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  studentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6B041',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentName: {
    flex: 1,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rejectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  acceptButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#003366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  subjectTabBar: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderTopWidth: 0,
    elevation: 8,
    height: 64,
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectTabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  subjectIconContainer: {
    padding: 8,
    borderRadius: 24,
  },
});