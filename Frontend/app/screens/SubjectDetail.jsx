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
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRBAC } from '../RBACComponents';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { contentService } from '../contentService';
import { subjectService } from '../subjectService';
import FABButton from '../../components/FABButton';

export default function SubjectDetail() {
  const { isTeacher, isStudent } = useRBAC();
  const router = useRouter();
  const { subjectId, subjectName } = useLocalSearchParams();
  
  const [content, setContent] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null); // Track selected tab for teachers
  const [studentTab, setStudentTab] = useState('lessons'); // Track selected tab for students: 'lessons', 'activities', 'favorites'
  const [contentFilter, setContentFilter] = useState('lecture'); // 'lecture', 'activity', 'quiz', 'all'
  
  // Content creation form
  const [contentType, setContentType] = useState('lecture'); // 'lecture', 'activity', 'quiz'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async (preserveExisting = false) => {
    if (!subjectId) return;
    
    try {
      // Load content
      const contentData = await contentService.getSubjectContent(subjectId);
      console.log('Loaded content data:', contentData?.length || 0, 'items');
      
      // Only update if we got actual data
      if (contentData && Array.isArray(contentData) && contentData.length > 0) {
        setContent(contentData);
      } else if (!preserveExisting) {
        // Only clear content if we're not preserving and got empty data
        setContent([]);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      if (!preserveExisting) {
        setContent([]);
      }
    }
    
    if (isTeacher) {
      try {
        // Load students
        const students = await subjectService.getSubjectStudents(subjectId);
        const enrolled = students.filter(student => student.status === 'approved');
        const pending = students.filter(student => student.status === 'pending');
        
        setEnrolledStudents(enrolled);
        setPendingStudents(pending);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    }
  };

  const handleAccept = async (studentId) => {
    try {
      await subjectService.acceptStudent(subjectId, studentId);
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
      setEnrolledStudents(prev => [...prev, pendingStudents.find(s => s.id === studentId)]);
      Alert.alert('Success', 'Student accepted');
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept student');
    }
  };

  const handleReject = async (studentId) => {
    const student = pendingStudents.find(s => s.id === studentId);
    Alert.alert(
      'Reject Student',
      `Are you sure you want to reject ${student?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await subjectService.rejectStudent(subjectId, studentId);
              setPendingStudents(prev => prev.filter(s => s.id !== studentId));
              Alert.alert('Rejected', 'Student has been rejected');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject student');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedPdf(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const createContent = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      // Backend only accepts one file at a time
      // Prioritize image over PDF
      let file = selectedImage || selectedPdf || null;

      const data = {
        title: title.trim(),
        content: description.trim() || '',
        type: contentType,
      };
      
      console.log('Data to send:', { title: data.title, content: data.content, type: data.type, hasFile: !!file });

      if (file) {
        data.file = file;
      }

      // Add max_score for activities and quizzes
      if (contentType === 'activity' || contentType === 'quiz') {
        data.maxScore = parseInt(maxScore) || 100;
      }

      const result = await contentService.createContent(subjectId, data);
      console.log('Created successfully:', result);
      
      // Reset form
      setTitle('');
      setDescription('');
      setMaxScore('100');
      setSelectedImage(null);
      setSelectedPdf(null);
      setCreating(false);
      
      // Immediately show the created item
      if (result && result.id) {
        // Add the created item to the state immediately
        const newItem = {
          ...result,
          type: contentType === 'quiz' ? 'activity' : contentType,
          created_at: result.created_at || new Date().toISOString() // Fallback for created_at
        };
        setContent(prev => {
          const updated = [...prev, newItem];
          return updated.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
          });
        });
        console.log('Added item to state:', newItem);
        console.log('Updated content count:', content.length + 1);
      }
      
      // Also reload content in case backend returned something different
      // But preserve existing content in case reload fails
      setTimeout(async () => {
        await loadData(true);
      }, 1000);
      
      Alert.alert('Success', `${contentType} created successfully`);
    } catch (error) {
      console.error('Error creating content:', error);
      const errorMessage = error?.message || error?.response?.data?.detail || 'Failed to create content. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const renderContentItem = ({ item }) => {
    console.log('Rendering content item:', item);
    return (
      <View style={styles.contentWrapper}>
        <View style={styles.contentRow}>
          <View style={styles.contentThumb} />
          <View style={styles.contentBar}>
            <Text style={styles.contentTitle}>{(item.title || 'Untitled').toUpperCase()}</Text>
            <Text style={styles.contentType}>{(item.type || 'content').toUpperCase()}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEnrolledStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentIcon}>
        <Ionicons name="person" size={20} color="#fff" />
      </View>
      <Text style={styles.studentName}>{item.name}</Text>
    </View>
  );

  const renderPendingStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentIcon}>
        <Ionicons name="person" size={20} color="#fff" />
      </View>
      <Text style={styles.studentName}>{item.name}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.rejectButton} 
          onPress={() => handleReject(item.id)}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptButton} 
          onPress={() => handleAccept(item.id)}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#28a745" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isTeacher ? 'ACT/LECTURE' : studentTab === 'lessons' ? 'LESSONS' : studentTab === 'activities' ? 'ACT/ASS' : 'FAVORITES'}
        </Text>
        {!isStudent && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadData}
          >
            <Ionicons name="refresh" size={24} color="#28a745" />
          </TouchableOpacity>
        )}
      </View>

      {/* Students Tab */}
      {selectedTab === 'students' && isTeacher && (
        <ScrollView style={styles.contentArea}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>WANT TO ENROLL</Text>
            <View style={styles.sectionContent}>
              <FlatList
                data={pendingStudents}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPendingStudent}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No pending enrollments</Text>
                }
              />
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>ENROLLED</Text>
            <View style={styles.sectionContent}>
              <FlatList
                data={enrolledStudents}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderEnrolledStudent}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No enrolled students</Text>
                }
              />
            </View>
          </View>
        </ScrollView>
      )}

      {/* Notifications Tab */}
      {selectedTab === 'notifications' && (
        <View style={styles.contentArea}>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}

      {/* FAB Button for creating content (Teachers only) */}
      {isTeacher && !creating && selectedTab !== 'students' && selectedTab !== 'notifications' && (
        <FABButton 
          bottom={120} 
          onPress={() => setCreating(true)} 
        />
      )}

      {/* Content Tab - Lectures, Activities, Quizzes with Filter Buttons (Teachers) */}
      {!isStudent && selectedTab !== 'students' && selectedTab !== 'notifications' && (
        <ScrollView style={styles.contentArea}>
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, contentFilter === 'lecture' && styles.filterButtonActive]}
              onPress={() => setContentFilter('lecture')}
            >
              <Text style={[styles.filterButtonText, contentFilter === 'lecture' && styles.filterButtonTextActive]}>
                LECTURE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, contentFilter === 'activity' && styles.filterButtonActive]}
              onPress={() => setContentFilter('activity')}
            >
              <Text style={[styles.filterButtonText, contentFilter === 'activity' && styles.filterButtonTextActive]}>
                ACTIVITY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, contentFilter === 'quiz' && styles.filterButtonActive]}
              onPress={() => setContentFilter('quiz')}
            >
              <Text style={[styles.filterButtonText, contentFilter === 'quiz' && styles.filterButtonTextActive]}>
                QUIZ
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filtered Content List */}
          <FlatList
            data={(() => {
              const filtered = content.filter(item => {
                if (contentFilter === 'lecture') return item.type === 'lecture';
                if (contentFilter === 'activity') return item.type === 'activity';
                if (contentFilter === 'quiz') return item.title?.startsWith('QUIZ:');
                return true;
              });
              console.log('Filtered content:', { 
                total: content.length, 
                filter: contentFilter, 
                filteredCount: filtered.length,
                filtered: filtered 
              });
              return filtered;
            })()}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={renderContentItem}
            contentContainerStyle={styles.contentList}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No content yet</Text>
            }
          />
        </ScrollView>
      )}

      {/* Student Content Tabs */}
      {isStudent && (
        <ScrollView style={styles.contentArea}>
          {/* Lessons Tab */}
          {studentTab === 'lessons' && (
            <View>
              <FlatList
                data={content.filter(item => item.type === 'lecture')}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderContentItem}
                contentContainerStyle={styles.contentList}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No lectures yet</Text>
                }
              />
            </View>
          )}

          {/* Activities Tab */}
          {studentTab === 'activities' && (
            <View>
              <FlatList
                data={content.filter(item => item.type === 'activity')}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderContentItem}
                contentContainerStyle={styles.contentList}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No activities yet</Text>
                }
              />
            </View>
          )}

          {/* Favorites Tab */}
          {studentTab === 'favorites' && (
            <View>
              <Text style={styles.emptyText}>No favorites yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Content Modal - Opens from FAB button */}
      <Modal 
        visible={creating} 
        transparent 
        animationType="slide" 
        onRequestClose={() => {
          setCreating(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modal}>
            <Text style={styles.modalTitle}>Create {contentType.toUpperCase()}</Text>
            
            {/* Type Selection */}
            <View style={styles.typeContainer}>
              <Text style={styles.label}>Type:</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity 
                  style={[styles.typeButton, contentType === 'lecture' && styles.typeButtonActive]}
                  onPress={() => setContentType('lecture')}
                >
                  <Text style={[styles.typeButtonText, contentType === 'lecture' && styles.typeButtonTextActive]}>
                    Lecture
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, contentType === 'activity' && styles.typeButtonActive]}
                  onPress={() => setContentType('activity')}
                >
                  <Text style={[styles.typeButtonText, contentType === 'activity' && styles.typeButtonTextActive]}>
                    Activity
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, contentType === 'quiz' && styles.typeButtonActive]}
                  onPress={() => setContentType('quiz')}
                >
                  <Text style={[styles.typeButtonText, contentType === 'quiz' && styles.typeButtonTextActive]}>
                    Quiz
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              autoFocus
            />

            <TextInput
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            {/* Max Score for Activities/Quizzes */}
            {(contentType === 'activity' || contentType === 'quiz') && (
              <TextInput
                placeholder="Max Score"
                value={maxScore}
                onChangeText={setMaxScore}
                style={styles.input}
                keyboardType="numeric"
              />
            )}

            {/* File Upload Section */}
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="image" size={20} color="#28a745" />
              <Text style={styles.uploadButtonText}>
                {selectedImage ? selectedImage.uri.split('/').pop() : 'Upload Image'}
              </Text>
              {selectedImage && (
                <TouchableOpacity onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={20} color="#dc3545" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Ionicons name="document" size={20} color="#28a745" />
              <Text style={styles.uploadButtonText}>
                {selectedPdf ? selectedPdf.uri.split('/').pop() : 'Upload PDF'}
              </Text>
              {selectedPdf && (
                <TouchableOpacity onPress={() => setSelectedPdf(null)}>
                  <Ionicons name="close-circle" size={20} color="#dc3545" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <Pressable style={[styles.btn, styles.cancel, styles.btnLeft]} onPress={() => setCreating(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primary, styles.btnRight]} onPress={createContent}>
                <Text style={styles.btnText}>Create</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Navigation Bar */}
      <View style={styles.subjectTabBar}>
        {isTeacher ? (
          <>
            {/* Tab 1: Students */}
            <TouchableOpacity 
              style={[styles.subjectTabItem, selectedTab === 'students' && styles.activeTab]}
              onPress={() => setSelectedTab('students')}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="people" size={24} color={selectedTab === 'students' ? '#28a745' : '#000'} />
              </View>
            </TouchableOpacity>
            
            {/* Tab 2: Content/Create */}
            <TouchableOpacity 
              style={[styles.subjectTabItem, selectedTab !== 'students' && selectedTab !== 'notifications' && styles.activeTab]}
              onPress={() => {
                setSelectedTab(null); // Show content view
              }}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="document-text" size={24} color="#28a745" />
              </View>
            </TouchableOpacity>
            
            {/* Tab 3: Notifications */}
            <TouchableOpacity 
              style={[styles.subjectTabItem, selectedTab === 'notifications' && styles.activeTab]}
              onPress={() => setSelectedTab('notifications')}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="notifications" size={24} color={selectedTab === 'notifications' ? '#28a745' : '#000'} />
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Student Navigation - Lessons Tab */}
            <TouchableOpacity 
              style={[styles.subjectTabItem, studentTab === 'lessons' && styles.activeTab]}
              onPress={() => setStudentTab('lessons')}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="book" size={24} color={studentTab === 'lessons' ? '#28a745' : '#000'} />
              </View>
            </TouchableOpacity>
            
            {/* Student Navigation - Activities Tab */}
            <TouchableOpacity 
              style={[styles.subjectTabItem, studentTab === 'activities' && styles.activeTab]}
              onPress={() => setStudentTab('activities')}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="document-text" size={24} color={studentTab === 'activities' ? '#28a745' : '#000'} />
              </View>
            </TouchableOpacity>
            
            {/* Student Navigation - Favorites Tab */}
            <TouchableOpacity 
              style={[styles.subjectTabItem, studentTab === 'favorites' && styles.activeTab]}
              onPress={() => setStudentTab('favorites')}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="star" size={24} color={studentTab === 'favorites' ? '#28a745' : '#000'} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#28a745',
    textAlign: 'center',
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  contentArea: {
    flex: 1,
    padding: 16,
  },
  contentList: {
    paddingBottom: 200,
  },
  contentWrapper: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cde9ce',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d6f0ff',
    marginRight: 12,
  },
  contentBar: {
    flex: 1,
    backgroundColor: '#0f7a67',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  contentTitle: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  contentType: {
    color: '#c8e6c9',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6c757d',
    fontSize: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: '#28a745',
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
    backgroundColor: '#000',
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
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  typeContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#28a745',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  uploadButtonText: {
    flex: 1,
    marginLeft: 8,
    color: '#6c757d',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnLeft: {
    marginRight: 12,
  },
  cancel: {
    backgroundColor: '#6c757d',
  },
  primary: {
    backgroundColor: '#28a745',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  subjectTabBar: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  filterButtonActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c757d',
    letterSpacing: 0.5,
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
});
