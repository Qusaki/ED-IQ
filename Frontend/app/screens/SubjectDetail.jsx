import { useEffect, useState, useCallback, useRef } from 'react';
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
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRBAC } from '../RBACComponents';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { contentService } from '../contentService';
import { subjectService } from '../subjectService';
import { notificationService } from '../notificationService';
import apiClient from '../apiConfig';
import FABButton from '../../components/FABButton';
import { WebView } from 'react-native-webview';

// Custom Donut Chart Component
const DonutChart = ({ size = 200, data, centerGrade }) => {
  // Generate colors for different activity types
  const colors = [
    '#E6B041', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#feca57', '#ff9ff3', '#54a0ff', '#48dbfb', '#00d2d3'
  ];

  // Process data for chart - group by activity type and calculate average
  const groupedData = {};

  try {
    data.forEach(item => {
      const key = item.category || 'Activity';
      if (!groupedData[key]) {
        groupedData[key] = {
          totalScore: 0,
          maxScore: 0,
          count: 0,
          title: key === 'quiz' ? 'Quiz' :
            key === 'major exam' ? 'Major Exam' :
              key === 'lab exam' ? 'Lab Exam' :
                key === 'assignment' ? 'Assignment' :
                  key === 'laboratory' ? 'Laboratory' :
                    key === 'project' ? 'Project' : 'Activity'
        };
      }
      groupedData[key].totalScore += item.score || 0;
      groupedData[key].maxScore += item.maxScore || 100;
      groupedData[key].count += 1;
    });

    // Calculate percentages for each activity type
    const chartData = Object.values(groupedData).map((item, index) => {
      const percentage = item.maxScore > 0 ? (item.totalScore / item.maxScore) * 100 : 0;
      return {
        ...item,
        percentage,
        color: colors[index % colors.length]
      };
    }).filter(item => item.count > 0); // Only include activities that exist

    return (
      <View>
        <View style={styles.chartContainer}>
          <View style={styles.donutWrapper}>
            {/* Donut chart using overlapping circles */}
            <View style={[styles.donutBase, { width: size, height: size }]}>
              {chartData.length > 0 ? (
                <>
                  {/* Background circle */}
                  <View style={[styles.donutBackground, {
                    width: size,
                    height: size,
                    borderRadius: size / 2
                  }]} />

                  {/* Performance rings */}
                  {chartData.map((item, index) => {
                    const ringSize = size - (index * 15);

                    return (
                      <View
                        key={index}
                        style={[
                          styles.donutRing,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                            borderWidth: 12,
                            borderColor: item.color,
                            borderTopColor: 'transparent',
                            borderLeftColor: 'transparent',
                            transform: [{ rotate: `${45 + (index * 30)}deg` }],
                            opacity: 0.8
                          }
                        ]}
                      />
                    );
                  })}

                  {/* Center circle for donut hole */}
                  <View style={[styles.donutHole, {
                    width: size * 0.6,
                    height: size * 0.6,
                    borderRadius: size * 0.3
                  }]}>
                    <Text style={styles.centerGrade}>{centerGrade || '0.0'}%</Text>
                    <Text style={styles.centerLabel}>Overall Grade</Text>
                  </View>
                </>
              ) : (
                <View style={[styles.donutHole, {
                  width: size * 0.8,
                  height: size * 0.8,
                  borderRadius: size * 0.4
                }]}>
                  <Text style={styles.centerGrade}>{centerGrade || '0.0'}%</Text>
                  <Text style={styles.centerLabel}>Overall Grade</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Legend */}
        {chartData.length > 0 && (
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Activity Types</Text>
            <View style={styles.legendContainer}>
              {chartData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <View style={styles.legendInfo}>
                    <Text style={styles.legendText}>{item.title}</Text>
                    <Text style={styles.legendPercentage}>{item.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  } catch (error) {
    console.error('Error in DonutChart:', error);
    return (
      <View style={styles.chartContainer}>
        <View style={styles.donutWrapper}>
          <View style={[styles.donutHole, {
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: size * 0.4
          }]}>
            <Text style={styles.centerGrade}>{centerGrade || '0.0'}%</Text>
            <Text style={styles.centerLabel}>Overall Grade</Text>
          </View>
        </View>
      </View>
    );
  }
};

// Content Cache
let _subjectContentCache = {}; // subjectId -> content
let _subjectContentCacheTime = {}; // subjectId -> timestamp
const CONTENT_CACHE_TTL = 8000; // 8 seconds

export default function SubjectDetail() {
  const insets = useSafeAreaInsets();
  const { isTeacher, isStudent } = useRBAC();
  const router = useRouter();
  const { subjectId: rawSubjectId, subjectName, refreshGrading, initialTab } = useLocalSearchParams();
  const subjectId = Array.isArray(rawSubjectId) ? rawSubjectId[0] : rawSubjectId;

  const [content, setContent] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [directCreateType, setDirectCreateType] = useState(null); // Track direct creation from filter buttons

  // Add ref for the main favorites scroll
  const favoritesScrollViewRef = useRef(null);
  const [showActivitySubmenu, setShowActivitySubmenu] = useState(false); // Track activity submenu modal
  const [showFloatingMenu, setShowFloatingMenu] = useState(false); // Track floating menu around FAB
  const [showProjectMenu, setShowProjectMenu] = useState(false); // Track project menu visibility
  const [selectedTab, setSelectedTab] = useState(null); // 'students', 'notifications', or null (content)
  const [submitting, setSubmitting] = useState(false);
  const [acceptingStudentId, setAcceptingStudentId] = useState(null);
  const [rejectingStudentId, setRejectingStudentId] = useState(null);
  const [studentTab, setStudentTab] = useState('lessons'); // Track selected tab for students: 'lessons', 'activities', 'favorites'
  const [activityFilter, setActivityFilter] = useState('all'); // Track selected activity type filter: 'all', 'quiz', 'assignment', 'lab', 'project', 'exam', 'lab_exam'
  const [contentFilter, setContentFilter] = useState('lecture'); // 'lecture', 'activity', 'quiz', 'exam', 'lab', 'assignment', 'project', 'all'
  const [submissionStatuses, setSubmissionStatuses] = useState({}); // Track submission status for activities
  const [insideNotifications, setInsideNotifications] = useState([]);
  const [insideNotificationsLoading, setInsideNotificationsLoading] = useState(false);
  const [notifRefreshing, setNotifRefreshing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Import and use shared read notifications state from main notifications
  const [readNotifications, setReadNotifications] = useState(new Set());
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [studentGrades, setStudentGrades] = useState([]);
  const [studentGradesLoading, setStudentGradesLoading] = useState(false);

  // Student performance state for Favorites tab
  const [studentPerformance, setStudentPerformance] = useState([]);
  const [currentGrade, setCurrentGrade] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Content creation form
  const [contentType, setContentType] = useState('lecture'); // 'lecture', 'activity', 'quiz', 'exam'
  const [editingLecture, setEditingLecture] = useState(null); // Track lecture being edited
  const [examCategory, setExamCategory] = useState('written'); // 'written', 'laboratory'
  const [examTerm, setExamTerm] = useState('midterm'); // 'midterm', 'final'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);

  // Due Date state
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // PDF Viewer state
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [subjectId, isTeacher, isStudent]);

  // Separate effect to handle initial tab setting - this ensures it runs after initial render
  useEffect(() => {
    if (initialTab) {
      if (isTeacher && initialTab === 'students') {
        console.log('[DEBUG] Setting selectedTab to "students" from initialTab');
        setSelectedTab('students');
      } else if (isTeacher && initialTab === 'notifications') {
        console.log('[DEBUG] Setting selectedTab to "notifications" from initialTab');
        setSelectedTab('notifications');
      } else if (isStudent) {
        console.log('[DEBUG] Setting studentTab to', initialTab, 'from initialTab');
        setStudentTab(initialTab);
      }
    }
  }, [initialTab, isTeacher, isStudent]);

  // Load inside notifications immediately when component mounts (for teachers)
  useEffect(() => {
    if (isTeacher && subjectId) {
      loadInsideNotifications();
    }
  }, [isTeacher, subjectId, loadInsideNotifications]);

  // Debug: Log state changes when selectedTab or students change
  useEffect(() => {
    console.log('[DEBUG] SubjectDetail render state:', {
      selectedTab,
      pendingStudents: pendingStudents.length,
      enrolledStudents: enrolledStudents.length,
      initialTab,
    });
  }, [selectedTab, pendingStudents.length, enrolledStudents.length, initialTab]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
      // Also refresh notifications when coming back to the screen
      if (isTeacher && subjectId) {
        loadInsideNotifications();
        // Always refresh grading system when teacher returns to subject
        if (selectedTab === 'notifications') {
          loadStudentGrades();
        }
      }
    }, [subjectId, isStudent, isTeacher, loadInsideNotifications, loadStudentGrades, selectedTab])
  );

  // Background polling for real-time feel (every 3 seconds)
  useEffect(() => {
    if (!subjectId) return;

    // Initial silent load to start polling immediately without interrupting existing UI
    const intervalId = setInterval(() => {
      // Silent load without triggering any loading states
      loadData(true, true);

      if (isTeacher) {
        if (selectedTab === 'grading') loadStudentGrades(true);
      } else if (isStudent && studentTab === 'favorites') {
        loadStudentPerformance(true);
      }
    }, 10000); // 10 seconds polling

    return () => clearInterval(intervalId);
  }, [subjectId, isTeacher, isStudent, selectedTab, studentTab]);

  const handleDirectCreate = (type) => {
    setDirectCreateType(type);
    setContentType(type);
    setCreating(true);
  };

  const closeModal = () => {
    setCreating(false);
    setEditingLecture(null);
    setDirectCreateType(null);
    // Reset form
    setTitle('');
    setDescription('');
    setMaxScore('100');
    setSelectedImage(null);
    setSelectedPdf(null);
    setExamCategory('written');
    setExamTerm('midterm');
    setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  };

  const loadData = async (preserveExisting = false, silent = false) => {
    if (!subjectId) return;

    // 1) Check Cache first if not silent/polling
    const now = Date.now();
    if (!silent && _subjectContentCache[subjectId] && (now - _subjectContentCacheTime[subjectId]) < CONTENT_CACHE_TTL) {
      setContent(_subjectContentCache[subjectId]);
      // Still load submission statuses in background if student
      if (isStudent) {
        loadSubmissionStatuses(_subjectContentCache[subjectId]);
      }
      // If we are teacher, we might still want to load students in bg
    }

    try {
      // Load content
      const contentData = await contentService.getSubjectContent(subjectId);
      console.log('Loaded content data:', contentData?.length || 0, 'items');

      // Update Cache
      _subjectContentCache[subjectId] = contentData;
      _subjectContentCacheTime[subjectId] = Date.now();

      // Only update if we got actual data or if we are not preserving
      if (contentData && Array.isArray(contentData)) {
        setContent(contentData);

        // Load submission statuses for students
        if (isStudent && contentData.length > 0) {
          loadSubmissionStatuses(contentData);
        }
      } else if (!preserveExisting) {
        setContent([]);
      }
    } catch (error) {
      console.log('Error loading content:', error);
      if (!preserveExisting) {
        setContent([]);
      }
    }

    if (isTeacher) {
      try {
        // Load students
        if (!silent) setStudentsLoading(true);
        console.log('[DEBUG] Fetching students for subjectId:', subjectId);
        const students = await subjectService.getSubjectStudents(subjectId);
        console.log('[DEBUG] Students received:', students?.length || 0);

        const enrolled = (students || []).filter(student =>
          student.status?.toLowerCase() === 'approved' ||
          student.status?.toLowerCase() === 'active'
        );
        const pending = (students || []).filter(student =>
          student.status?.toLowerCase() === 'pending'
        );

        console.log('[DEBUG] Filtered: Enrolled=', enrolled.length, 'Pending=', pending.length);
        setEnrolledStudents(enrolled);
        setPendingStudents(pending);
      } catch (error) {
        if (!silent) console.log('Error loading students:', error);
      } finally {
        if (!silent) setStudentsLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false, false);
    if (isTeacher && selectedTab === 'notifications') await loadStudentGrades();
    setRefreshing(false);
  };

  // Load submission statuses for activities and exams
  const loadSubmissionStatuses = async (contentData) => {
    const statuses = {};

    for (const item of contentData) {
      if (item.type === 'activity') {
        try {
          const status = await contentService.getSubmissionStatus(item.id);
          // Store status for all submitted activities (graded or not)
          if (status.submitted) {
            statuses[item.id] = status;
            console.log(`Activity ${item.id} submission status:`, status);
          }
        } catch (error) {
          console.error('Error loading submission status:', error);
        }
      }
    }

    setSubmissionStatuses(statuses);
  };

  const loadInsideNotifications = useCallback(async (silent = false) => {
    if (!subjectId) {
      setInsideNotifications([]);
      return;
    }

    if (!silent) console.log('Loading inside notifications for subject:', subjectId);
    if (!silent) setInsideNotificationsLoading(true);
    try {
      const items = await notificationService.getSubjectNotifications(subjectId);
      if (!silent) console.log('Loaded inside notifications:', items?.length || 0, 'items');
      setInsideNotifications(items || []);
    } catch (error) {
      if (!silent) console.warn('Failed to load subject notifications:', error);
    } finally {
      if (!silent) setInsideNotificationsLoading(false);
    }
  }, [subjectId]);

  const refreshInsideNotifications = useCallback(async (silent = false) => {
    if (!silent) setNotifRefreshing(true);
    await loadInsideNotifications(silent);
    if (!silent) setNotifRefreshing(false);
  }, [loadInsideNotifications]);

  // Weighted grade computation - replicates backend gradecomputation.py
  const computeWeightedGrade = (activities, getScore) => {
    const computeTermGrade = (termActivities) => {
      const labScores = [], labMax = [];
      const quizScores = [], quizMax = [];
      const assignmentScores = [], assignmentMax = [];
      const attendanceScores = [], attendanceMax = [];
      let majorExam = 0, majorExamTotal = 0;
      let labExam = 0, labExamTotal = 0;
      let project = 0, projectTotal = 0;

      for (const activity of termActivities) {
        const score = getScore(activity);
        const maxScore = activity.max_score || 100;

        if (activity.category === 'laboratory') {
          if (score > 0) labScores.push(score);
          labMax.push(maxScore);
        } else if (activity.category === 'quiz') {
          if (score > 0) quizScores.push(score);
          quizMax.push(maxScore);
        } else if (activity.category === 'assignment') {
          if (score > 0) assignmentScores.push(score);
          assignmentMax.push(maxScore);
        } else if (activity.category === 'attendance') {
          if (score > 0) attendanceScores.push(score);
          attendanceMax.push(maxScore);
        } else if (activity.category === 'major exam') {
          if (score > 0) majorExam = score;
          majorExamTotal = maxScore;
        } else if (activity.category === 'lab exam') {
          if (score > 0) labExam = score;
          labExamTotal = maxScore;
        } else if (activity.category === 'project') {
          if (score > 0) project = score;
          projectTotal = maxScore;
        }
      }

      // Class Standing: lab 30%, quiz 10%, assignment 5%, attendance 5%
      const labTotal = labMax.reduce((a, b) => a + b, 0);
      const quizTotal = quizMax.reduce((a, b) => a + b, 0);
      const assignmentTotal = assignmentMax.reduce((a, b) => a + b, 0);
      const attendanceTotal = attendanceMax.reduce((a, b) => a + b, 0);

      const labPercent = labTotal > 0 ? (labScores.reduce((a, b) => a + b, 0) / labTotal) * 100 : 0;
      const quizPercent = quizTotal > 0 ? (quizScores.reduce((a, b) => a + b, 0) / quizTotal) * 100 : 0;
      const assignmentPercent = assignmentTotal > 0 ? (assignmentScores.reduce((a, b) => a + b, 0) / assignmentTotal) * 100 : 0;
      const attendancePercent = attendanceTotal > 0 ? (attendanceScores.reduce((a, b) => a + b, 0) / attendanceTotal) * 100 : 0;

      const labWeight = labTotal > 0 ? 0.3 : 0;
      const quizWeight = quizTotal > 0 ? 0.1 : 0;
      const assignmentWeight = assignmentTotal > 0 ? 0.05 : 0;
      const attendanceWeight = attendanceTotal > 0 ? 0.05 : 0;

      const classStanding = (labPercent * 0.3) + (quizPercent * 0.1) + (assignmentPercent * 0.05) + (attendancePercent * 0.05);
      const classStandingWeight = labWeight + quizWeight + assignmentWeight + attendanceWeight;

      // Exams: major exam 20%, lab exam 25%, project 5%
      const majorExamPercent = majorExamTotal > 0 ? (majorExam / majorExamTotal) * 100 : 0;
      const labExamPercent = labExamTotal > 0 ? (labExam / labExamTotal) * 100 : 0;
      const projectPercent = projectTotal > 0 ? (project / projectTotal) * 100 : 0;

      const majorExamWeight = majorExamTotal > 0 ? 0.2 : 0;
      const labExamWeight = labExamTotal > 0 ? 0.25 : 0;
      const projectWeight = projectTotal > 0 ? 0.05 : 0;

      const examScore = (majorExamPercent * 0.2) + (labExamPercent * 0.25) + (projectPercent * 0.05);
      const examWeight = majorExamWeight + labExamWeight + projectWeight;

      const totalScore = classStanding + examScore;
      const totalPossibleWeight = classStandingWeight + examWeight;

      if (totalPossibleWeight === 0) return 0;

      return totalScore / totalPossibleWeight;
    };

    const midtermActivities = activities.filter(a => a.term === 'midterm');
    const finalActivities = activities.filter(a => a.term === 'final');

    let midtermGrade = 0;
    if (midtermActivities.length > 0) {
      midtermGrade = computeTermGrade(midtermActivities);
    }

    let finalGrade = null; // Backend default when no final activities
    if (finalActivities.length > 0) {
      finalGrade = computeTermGrade(finalActivities);
    }

    // If no midterm activities exist either, return 0 instead of averaging with 100
    if (midtermActivities.length === 0 && finalActivities.length === 0) {
      return 0;
    }

    // If no final activities, semestral grade is just midterm grade
    if (finalGrade === null) {
      return midtermGrade;
    }

    return (midtermGrade + finalGrade) / 2;
  };

  // Load students for grading system - relies on optimized backend formula
  const loadStudentGrades = useCallback(async (silent = false) => {
    if (!subjectId) {
      setStudentGrades([]);
      return;
    }

    if (!silent) {
      console.log('=== LOADING GRADING SYSTEM ===');
      setStudentGradesLoading(true);
    }
    try {
      // Get all enrolled students matching backend calculation
      let enrolledStudents = [];
      try {
        enrolledStudents = await subjectService.getSubjectStudents(subjectId);
        if (!silent) console.log('Found enrolled students:', enrolledStudents.length);
      } catch (studentError) {
        console.error('Failed to load students list:', studentError?.response?.status, studentError?.config?.url);
      }

      // Map id to names for immediate UI
      const studentNameMap = {};
      enrolledStudents.forEach(s => {
         studentNameMap[s.id] = s.name || s.email || `Student ${String(s.id).slice(-6)}`;
      });

      // Call bulk grade endpoint
      console.log('Calling grade endpoint: /computegrade/all/' + subjectId);
      const response = await apiClient.get(`/computegrade/all/${subjectId}`);
      const bulkGrades = response.data || [];

      const grades = bulkGrades.map(g => ({
          student_id: g.student_id,
          student_name: studentNameMap[g.student_id] || `Student ${String(g.student_id).slice(-6)}`,
          final_grade: g.score || 0
      }));

      console.log('Loaded student grades from backend bulk calculation:', grades.length, 'students');
      
      // Sort grades by score descending
      grades.sort((a, b) => b.final_grade - a.final_grade);
      setStudentGrades(grades);
    } catch (error) {
      console.error('Failed to load grades:', error?.response?.status, error?.config?.url, error?.message);
      setStudentGrades([]);
    } finally {
      if (!silent) setStudentGradesLoading(false);
    }
  }, [subjectId]);

  // Load student performance data for Favorites tab
  const loadStudentPerformance = useCallback(async (silent = false) => {
    if (!subjectId || !isStudent) {
      setStudentPerformance([]);
      setCurrentGrade(null);
      return;
    }

    if (!silent) {
      console.log('Loading student performance for subject:', subjectId);
      setPerformanceLoading(true);
    }
    try {
      // Load performance breakdown
      const performance = await contentService.getStudentPerformance(subjectId);
      console.log('Loaded student performance:', performance.length, 'items');
      setStudentPerformance(performance);

      // Load current grade from backend with offline handling
      try {
        const grade = await contentService.getStudentGrade(subjectId);
        console.log('Loaded current grade from backend:', grade);

        if (!grade || grade.score === undefined || grade.score === null) {
          console.log('Backend grade not available, calculating with weighted formula');
          // Use weighted formula as fallback
          const calculatedGrade = computeWeightedGrade(performance, (item) => item.score || 0);
          setCurrentGrade({ score: calculatedGrade });
        } else {
          setCurrentGrade(grade);
        }
      } catch (gradeError) {
        console.warn('Backend not available - using weighted fallback:', gradeError.message);
        const calculatedGrade = computeWeightedGrade(performance, (item) => item.score || 0);
        setCurrentGrade({ score: calculatedGrade });
      }
    } catch (error) {
      console.error('Failed to load student performance:', error);
      setStudentPerformance([]);
      setCurrentGrade({ score: 0 });
    } finally {
      setPerformanceLoading(false);
    }
  }, [subjectId, isStudent]);

  // Scroll to bottom of performance section
  const scrollToBottomOfActivities = () => {
    if (favoritesScrollViewRef.current) {
      favoritesScrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    if (selectedTab === 'notifications' && isTeacher) {
      loadInsideNotifications();
      loadStudentGrades();
    }
  }, [selectedTab, isTeacher]);

  // Listen for grading refresh triggers from ActivityDetail
  useEffect(() => {
    if (refreshGrading && isTeacher) {
      console.log('Refreshing grading system due to grade assignment');
      loadStudentGrades();
    }
  }, [refreshGrading, isTeacher]);

  // Load performance data when student switches to favorites tab
  useEffect(() => {
    if (studentTab === 'favorites' && isStudent) {
      loadStudentPerformance();
    }
  }, [studentTab, isStudent, loadStudentPerformance]);

  // Also refresh when tab becomes active (to catch any missed updates)
  useEffect(() => {
    if (selectedTab === 'notifications' && isTeacher && studentGrades.length > 0) {
      console.log('Refreshing grading system on tab activation');
      loadStudentGrades();
    }
  }, [selectedTab, isTeacher, studentGrades.length]);

  // Initialize readNotifications from persistent storage
  useEffect(() => {
    const initializeReadNotifications = async () => {
      if (isTeacher) {
        // Don't clear generated notifications - preserve them like Student Interface
        // notificationService.clearAllNotificationsOnRefresh();

        // Get backend notifications and preserve their read state
        const backend = await notificationService.getBackendNotifications();
        const backendReadIds = new Set(backend.filter(n => n.is_read === true || n.is_read === 1).map(n => n.id));

        // Also get generated notification read state
        const generatedReadIds = notificationService.getReadGeneratedNotifications();

        // Also get inside notification read state
        const insideReadIds = notificationService.getReadInsideNotifications();

        // Merge all read states and set globally
        const allReadIds = new Set([...backendReadIds, ...generatedReadIds, ...insideReadIds]);
        notificationService.setGlobalReadNotifications(allReadIds);
        setReadNotifications(allReadIds);
      }
    };

    initializeReadNotifications();
  }, [isTeacher]);

  // Sync with global state whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isTeacher) {
        // Sync with global read state whenever screen comes into focus
        const globalReadIds = notificationService.getGlobalReadNotifications();
        setReadNotifications(globalReadIds);
        console.log('Synced SubjectDetail with global state:', globalReadIds.size);
      }
    }, [isTeacher])
  );

  const markNotificationAsRead = (notificationId) => {
    // Update global shared state
    notificationService.addToGlobalReadNotifications(notificationId);

    // Update local state for immediate UI update
    setReadNotifications(prev => new Set([...prev, notificationId]));

    // Also update persistent storage
    notificationService.markInsideNotificationAsRead(notificationId);
  };

  const getUnreadNotificationCount = () => {
    const count = insideNotifications.filter(n => !readNotifications.has(n.id)).length;
    console.log('Unread notification count calculation:', {
      totalNotifications: insideNotifications.length,
      readNotifications: readNotifications.size,
      unreadCount: count,
      notificationIds: insideNotifications.map(n => n.id),
      readIds: Array.from(readNotifications.values())
    });
    return count;
  };

  const handleNotificationPress = async (notification) => {
    console.log('=== SUBJECT DETAIL NOTIFICATION CLICK ===');
    console.log('Notification ID:', notification.id);
    console.log('Notification type:', notification.type);
    console.log('Is already read:', readNotifications.has(notification.id));
    console.log('Current read notifications:', Array.from(readNotifications.values()));

    // Mark as read if not already read
    if (!readNotifications.has(notification.id)) {
      console.log('Marking notification as read:', notification.id);

      // Use main notificationService.markAsRead for proper persistence like general notifications
      try {
        await notificationService.markAsRead(notification.id);
        console.log('Successfully marked as read on backend');
      } catch (error) {
        console.warn('Failed to mark notification as read on backend:', error);
      }

      // Then mark locally for immediate UI update
      markNotificationAsRead(notification.id);
      console.log('Updated local read state');
    } else {
      console.log('Notification already marked as read');
    }

    // Navigate to the activity/exam if it's a submission notification
    if (notification.type === 'submission' && notification.activity_id) {
      // ... existing submission logic ...
      try {
        const activityDetails = content.find(item => item.id === notification.activity_id);
        if (activityDetails) {
          router.push({
            pathname: '/screens/ActivityDetail',
            params: {
              activity: JSON.stringify(activityDetails),
              subjectId: subjectId,
              subjectName: subjectName || 'Subject'
            }
          });
        } else {
          await loadData();
          const updatedContent = await contentService.getSubjectContent(subjectId);
          const foundActivity = updatedContent.find(item => item.id === notification.activity_id);
          if (foundActivity) {
            router.push({
              pathname: '/screens/ActivityDetail',
              params: {
                activity: JSON.stringify(foundActivity),
                subjectId: subjectId,
                subjectName: subjectName || 'Subject'
              }
            });
          } else {
            Alert.alert('Error', 'Activity not found');
          }
        }
      } catch (error) {
        console.error('Error navigating to activity:', error);
        Alert.alert('Error', 'Could not open the activity details');
      }
    } else if (notification.type === 'enrollment_request') {
      // Switch to students tab
      console.log('[DEBUG] Internal notification: Switching to students tab');
      setSelectedTab('students');
      setShowNotificationsModal(false);
      // Reload students data to be sure
      loadData();
    }
  };

  const handleAccept = async (studentId) => {
    try {
      setAcceptingStudentId(studentId);
      await subjectService.acceptStudent(subjectId, studentId);
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
      setEnrolledStudents(prev => [...prev, pendingStudents.find(s => s.id === studentId)]);
      // Alert.alert('Success', 'Student accepted');
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept student');
    } finally {
      setAcceptingStudentId(null);
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
              setRejectingStudentId(studentId);
              await subjectService.rejectStudent(subjectId, studentId);
              setPendingStudents(prev => prev.filter(s => s.id !== studentId));
              Alert.alert('Rejected', 'Student has been rejected');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject student');
            } finally {
              setRejectingStudentId(null);
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant permission to access photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image selected:', result.assets[0]);
        setSelectedImage(result.assets[0]);
      } else {
        console.log('Image selection cancelled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      console.log('Starting document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      if (!result.canceled && result.assets[0]) {
        console.log('PDF selected:', result.assets[0]);
        setSelectedPdf(result.assets[0]);
      } else {
        console.log('Document selection cancelled');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const createContent = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setSubmitting(true);
      // Backend only accepts one file at a time
      // Prioritize image over PDF
      let file = selectedImage || selectedPdf || null;

      const data = {
        title: title.trim(),
        content: description.trim() || '',
        type: contentType,
      };

      console.log('=== CREATING CONTENT ===');
      console.log('Data to send:', { title: data.title, content: data.content, type: data.type, hasFile: !!file });

      if (file) {
        console.log('File details:', {
          uri: file.uri,
          name: file.name || file.filename,
          type: file.type || file.mimeType,
          size: file.fileSize || file.size
        });
        data.file = file;
      }

      // Add max_score for activities, quizzes, and exams
      if (contentType === 'activity' || contentType === 'quiz' || contentType === 'exam' || contentType === 'lab' || contentType === 'assignment' || contentType === 'project') {
        data.maxScore = parseInt(maxScore) || 100;
      }

      // Add term field for activities, quizzes, and exams
      if (contentType === 'activity' || contentType === 'quiz' || contentType === 'exam' || contentType === 'lab' || contentType === 'assignment' || contentType === 'project') {
        data.term = examTerm;
        data.dueDate = dueDate ? dueDate.toISOString() : null;
      }

      // Add exam-specific fields
      if (contentType === 'exam') {
        data.category = examCategory === 'written' ? 'major exam' : 'lab exam';
      } else if (contentType === 'lab') {
        data.category = 'laboratory';
      } else if (contentType === 'assignment') {
        data.category = 'assignment';
      } else if (contentType === 'project') {
        data.category = 'project';
      }

      console.log('Final data object:', data);

      let result;
      if (editingLecture) {
        console.log('Calling contentService.updateLecture...');
        result = await contentService.updateLecture(editingLecture.id, data);
        console.log('Updated successfully:', result);
        // Alert.alert('Success', `Lecture updated successfully`);
      } else {
        console.log('Calling contentService.createContent...');
        result = await contentService.createContent(subjectId, data);
        console.log('Created successfully:', result);
        // Alert.alert('Success', `${contentType} created successfully`);
      }

      // Reset form
      setTitle('');
      setDescription('');
      setMaxScore('100');
      setSelectedImage(null);
      setSelectedPdf(null);
      setExamCategory('written');
      setExamTerm('midterm');
      setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
      closeModal();

      // Immediately show the created item
      if (result && result.id) {
        // Add the created item to the state immediately
        const newItem = {
          ...result,
          type: (contentType === 'quiz' || contentType === 'project') ? 'activity' : contentType,
          created_at: result.created_at || new Date().toISOString() // Fallback for created_at
        };
        setContent(prev => {
          // If the item already exists (like after an edit), replace it. Otherwise, add it.
          const exists = prev.some(item => item.id === result.id);
          const updated = exists
            ? prev.map(item => item.id === result.id ? newItem : item)
            : [...prev, newItem];

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

      // Alert.alert('Success', `${contentType} created successfully`);
    } catch (error) {
      console.error('=== ERROR CREATING CONTENT ===');
      console.error('Error details:', error);
      console.error('Error response:', error?.response);
      console.error('Error data:', error?.response?.data);
      console.error('Error status:', error?.response?.status);

      const errorMessage = error?.message || error?.response?.data?.detail || 'Failed to create content. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPdf = (lecture) => {
    if (lecture.file_url) {
      setSelectedLecture(lecture);
    } else {
      Alert.alert('No PDF', 'This lecture does not have a PDF attached.');
    }
  };

  const handleEditLecture = (lecture) => {
    setContentType('lecture');
    setTitle(lecture.title || '');
    setDescription(lecture.content || '');
    setEditingLecture(lecture);
    setCreating(true);
  };

  const handleDeleteLecture = (lecture) => {
    Alert.alert(
      'Delete Lecture',
      `Are you sure you want to delete "${lecture.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contentService.deleteLecture(lecture.id);
              setContent(prev => prev.filter(c => c.id !== lecture.id));
              Alert.alert('Deleted', 'Lecture deleted successfully');
            } catch (error) {
              console.error('Delete lecture error:', error);
              Alert.alert('Error', 'Failed to delete lecture');
            }
          }
        }
      ]
    );
  };

  const handleOpenPdf = async (url) => {
    try {
      setPdfLoading(false); // PDF viewer will handle loading
      console.log('Opening PDF URL:', url);
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Failed to open PDF');
    }
  };

  const handleActivityPress = (item) => {
    // Navigate to activity detail screen with the item data
    router.push({
      pathname: '/screens/ActivityDetail',
      params: {
        activity: JSON.stringify(item),
        subjectId: subjectId,
        subjectName: subjectName || 'Subject'
      }
    });
  };

  const renderContentItem = ({ item }) => {
    console.log('Rendering content item:', item);
    const hasPdf = item.file_url || item.file;
    const isExam = item.type === 'activity' && (item.category === 'major exam' || item.category === 'lab exam');
    const isLab = item.type === 'activity' && item.category === 'laboratory';
    const isAssignment = item.type === 'activity' && item.category === 'assignment';
    const isProject = item.type === 'activity' && item.category === 'project';
    const isQuiz = item.type === 'activity' && item.category === 'quiz';
    const isActivity = isExam || isLab || isAssignment || isProject || isQuiz;
    const showTerm = (item.type === 'activity' || item.type === 'quiz' || isExam || isLab || isAssignment || isProject) && item.term;

    // Check submission status for students
    const submissionStatus = isStudent && isActivity ? submissionStatuses[item.id] : null;

    // Determine the onPress handler based on content type
    const onPressHandler = () => {
      if (item.type === 'lecture' && hasPdf) {
        handleViewPdf(item);
      } else if (isActivity) {
        handleActivityPress(item);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.contentWrapper, isActivity && styles.activityWrapper]}
        onPress={onPressHandler}
        activeOpacity={0.7}
      >
        <View style={styles.contentRow}>
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle} numberOfLines={1}>{(item.title || 'Untitled').toUpperCase()}</Text>
            <Text style={[
              styles.contentType,
              { color: '#E6B041' }
            ]}>
              {isExam ? 'EXAM' : isLab ? 'LAB' : isAssignment ? 'ASSIGNMENT' :
                isProject ? 'PROJECT' : isQuiz ? 'QUIZ' : (item.type || 'content').toUpperCase()}
              {isExam && ` - ${item.category === 'major exam' ? 'Written' : 'Laboratory'}`}
              {showTerm && ` (${item.term || 'Midterm'})`}
            </Text>

            <View style={styles.contentMetaRow}>
              {hasPdf && item.type === 'lecture' ? (
                <View style={styles.metaBadge}>
                  <Ionicons name="document-text" size={14} color="#6c757d" />
                  <Text style={styles.contentSubtext}>PDF Available</Text>
                </View>
              ) : isActivity ? (
                <View style={styles.metaBadge}>
                  <Ionicons name="eye" size={14} color="#6c757d" />
                  <Text style={styles.contentSubtext}>Tap to view details</Text>
                </View>
              ) : null}

              {/* Show submission status for students */}
              {submissionStatus && (
                <View style={styles.submissionStatus}>
                  <Ionicons name="checkmark-circle" size={14} color="#E6B041" />
                  <Text style={[styles.submissionStatusText, { color: '#E6B041' }]}>
                    Submitted
                  </Text>
                </View>
              )}
            </View>
          </View>
          {isTeacher && item.type === 'lecture' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => handleEditLecture(item)}
              >
                <Ionicons name="pencil" size={20} color="#003366" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => handleDeleteLecture(item)}
              >
                <Ionicons name="trash" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardArrow}>
              <Text style={styles.arrowIcon}>›</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEnrolledStudent = ({ item }) => (
    <View style={styles.studentCard}>
      {item.profile_picture ? (
        <Image
          source={{ uri: item.profile_picture }}
          style={styles.studentProfileImage}
        />
      ) : (
        <View style={styles.studentIcon}>
          <Ionicons name="person" size={20} color="#E6B041" />
        </View>
      )}
      <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
    </View>
  );

  const renderPendingStudent = ({ item }) => (
    <View style={styles.studentCard}>
      {item.profile_picture ? (
        <Image
          source={{ uri: item.profile_picture }}
          style={styles.studentProfileImage}
        />
      ) : (
        <View style={styles.studentIcon}>
          <Ionicons name="person" size={20} color="#6c757d" />
        </View>
      )}
      <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
          disabled={rejectingStudentId === item.id || acceptingStudentId === item.id}
        >
          {rejectingStudentId === item.id ? (
            <ActivityIndicator size="small" color="#dc3545" />
          ) : (
            <Ionicons name="close" size={24} color="#dc3545" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
          disabled={rejectingStudentId === item.id || acceptingStudentId === item.id}
        >
          {acceptingStudentId === item.id ? (
            <ActivityIndicator size="small" color="#E6B041" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#E6B041" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStudentGrade = ({ item }) => {
    console.log('Rendering student grade item:', item);
    console.log('Student name:', item.student_name);
    console.log('Final grade:', item.final_grade);
    console.log('Final grade type:', typeof item.final_grade);

    // Ensure final_grade is a number
    const grade = Number(item.final_grade) || 0;
    console.log('Converted grade:', grade, 'type:', typeof grade);

    return (
      <View style={styles.simpleGradedCard}>
        <View style={styles.simpleGradedRow}>
          <Text style={styles.simpleStudentName}>{item.student_name}</Text>
          <Text style={styles.simpleFinalGrade}>
            {grade.toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  // Debug: Check studentGrades state
  console.log('Current studentGrades state:', studentGrades);
  console.log('StudentGrades length:', studentGrades.length);

  return (
    <View style={styles.container}>
      <View style={[
        styles.headerRow,
        isTeacher ? { backgroundColor: '#003366', marginBottom: 0 } : { backgroundColor: '#E6B041' },
        { paddingTop: Math.max(16, insets.top) }
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={isTeacher ? "#E6B041" : "#003366"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTeacher && { color: '#E6B041' }]}>
          {isTeacher ? (selectedTab === 'notifications' ? 'GRADING SYSTEM' : selectedTab === 'students' ? 'STUDENTS LIST' : 'ASSESSMENT TASK') : studentTab === 'lessons' ? 'LESSONS' : studentTab === 'activities' ? 'ACTIVITIES' : 'PERFORMANCE'}
        </Text>
      </View>

      {/* Students Tab */}
      {selectedTab === 'students' && isTeacher && (
        <ScrollView
          style={styles.contentArea}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E6B041']} />
          }
        >
          {studentsLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
              <ActivityIndicator size="large" color="#E6B041" />
              <Text style={{ marginTop: 12, color: '#6c757d', fontSize: 16 }}>Loading student list...</Text>
            </View>
          ) : (
            <>
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
            </>
          )}
        </ScrollView>
      )}

      {/* Grading System Tab */}
      {selectedTab === 'notifications' && isTeacher && (
        <ScrollView style={styles.contentArea}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>GRADING SYSTEM</Text>
            <View style={styles.sectionContent}>
              {studentGradesLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
                  <ActivityIndicator size="large" color="#E6B041" />
                  <Text style={{ marginTop: 12, color: '#6c757d', fontSize: 16 }}>Loading grading system...</Text>
                </View>
              ) : studentGrades.length === 0 ? (
                <Text style={styles.emptyText}>No enrolled students found.</Text>
              ) : (
                <FlatList
                  data={studentGrades}
                  keyExtractor={(item) => item.student_id}
                  renderItem={renderStudentGrade}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* FAB Button for creating content (Teachers only) */}
      {isTeacher && !creating && selectedTab !== 'students' && selectedTab !== 'notifications' && (
        <FABButton
          bottom={120}
          color="#003366"
          iconColor="#E6B041"
          onPress={() => {
            if (contentFilter === 'exam') {
              // Toggle the project menu for exams
              setShowProjectMenu(prev => !prev);
            } else if (contentFilter === 'lecture') {
              handleDirectCreate('lecture');
            } else if (contentFilter === 'activity') {
              // Toggle the floating menu for activities
              setShowFloatingMenu(prev => !prev);
            } else {
              // Default behavior - show type selection
              setCreating(true);
            }
          }}
        />
      )}

      {/* Exam Floating Action Menu - Only show when exam filter is active and menu is toggled */}
      {showProjectMenu && contentFilter === 'exam' && (
        <View style={[styles.floatingMenuContainer, { bottom: 180 }]}>
          <View style={styles.floatingMenu}>
            {/* Exam Button */}
            <TouchableOpacity
              style={[
                styles.floatingMenuItem,
                styles.floatingMenuItem5, // Style for exam button
                styles.floatingMenuItemVisible
              ]}
              onPress={() => {
                console.log('Exam button pressed');
                setShowProjectMenu(false);
                handleDirectCreate('exam');
              }}
            >
              <Text style={styles.floatingMenuText}>Exam</Text>
              <View style={styles.floatingMenuIcon}>
                <Ionicons name="school" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Project Button */}
            <TouchableOpacity
              style={[
                styles.floatingMenuItem,
                styles.floatingMenuItem4, // Style for project button
                styles.floatingMenuItemVisible
              ]}
              onPress={() => {
                console.log('Project button pressed');
                setShowProjectMenu(false);
                handleDirectCreate('project');
              }}
            >
              <Text style={styles.floatingMenuText}>Project</Text>
              <View style={styles.floatingMenuIcon}>
                <Ionicons name="folder" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Floating Action Menu - Only show when activity filter is active and menu is toggled */}
      {showFloatingMenu && contentFilter === 'activity' && (
        <View style={styles.floatingMenuContainer}>
          <View style={styles.floatingMenu}>
            {/* Quiz Button */}
            <TouchableOpacity
              style={[
                styles.floatingMenuItem,
                styles.floatingMenuItem1,
                styles.floatingMenuItemVisible
              ]}
              onPress={() => {
                console.log('Quiz button pressed');
                setShowFloatingMenu(false);
                handleDirectCreate('quiz');
              }}
            >
              <Text style={styles.floatingMenuText}>Quiz</Text>
              <View style={styles.floatingMenuIcon}>
                <Ionicons name="help-circle" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Assignment Button */}
            <TouchableOpacity
              style={[
                styles.floatingMenuItem,
                styles.floatingMenuItem2,
                styles.floatingMenuItemVisible
              ]}
              onPress={() => {
                console.log('Assignment button pressed');
                setShowFloatingMenu(false);
                handleDirectCreate('assignment');
              }}
            >
              <Text style={styles.floatingMenuText}>Assignment</Text>
              <View style={styles.floatingMenuIcon}>
                <Ionicons name="create" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Laboratory Button */}
            <TouchableOpacity
              style={[
                styles.floatingMenuItem,
                styles.floatingMenuItem3,
                styles.floatingMenuItemVisible
              ]}
              onPress={() => {
                console.log('Laboratory button pressed');
                setShowFloatingMenu(false);
                handleDirectCreate('lab');
              }}
            >
              <Text style={styles.floatingMenuText}>Laboratory</Text>
              <View style={styles.floatingMenuIcon}>
                <Ionicons name="flask" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content Tab - Lectures, Activities, Quizzes with Filter Buttons (Teachers) */}
      {!isStudent && selectedTab !== 'students' && selectedTab !== 'notifications' && (
        <ScrollView style={styles.contentArea}>
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, contentFilter === 'lecture' && styles.filterButtonActive]}
              onPress={() => {
                setContentFilter('lecture');
                setShowFloatingMenu(false); // Close floating menu when switching filters
              }}
            >
              <Text style={[styles.filterButtonText, contentFilter === 'lecture' && styles.filterButtonTextActive]}>
                LECTURE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, contentFilter === 'activity' && styles.filterButtonActive]}
              onPress={() => {
                setContentFilter('activity');
                // Don't automatically show floating menu when clicking ACTIVITY
                // User needs to click the FAB to show the menu
              }}
            >
              <Text style={[styles.filterButtonText, contentFilter === 'activity' && styles.filterButtonTextActive]}>
                ACTIVITY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, contentFilter === 'exam' && styles.filterButtonActive]}
              onPress={() => {
                setContentFilter('exam');
                setShowFloatingMenu(false); // Close floating menu when switching filters
              }}
            >
              <Text style={[styles.filterButtonText, contentFilter === 'exam' && styles.filterButtonTextActive]}>
                EXAM
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filtered Content List */}
          <FlatList
            data={(() => {
              const filtered = content.filter(item => {
                if (contentFilter === 'lecture') return item.type === 'lecture';
                if (contentFilter === 'activity') return item.type === 'activity' && item.category !== 'major exam' && item.category !== 'lab exam' && item.category !== 'project';
                if (contentFilter === 'exam') return item.category === 'major exam' || item.category === 'lab exam' || item.category === 'project';
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
            <View style={styles.studentContentContainer}>
              {/* Activity Type Filter Buttons */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.activityFilterScrollView}
                contentContainerStyle={styles.activityFilterContent}
              >
                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'all' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('all')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'all' && styles.activityFilterTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'quiz' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('quiz')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'quiz' && styles.activityFilterTextActive]}>
                    Quiz
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'assignment' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('assignment')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'assignment' && styles.activityFilterTextActive]}>
                    Assignment
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'lab' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('lab')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'lab' && styles.activityFilterTextActive]}>
                    Laboratory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'project' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('project')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'project' && styles.activityFilterTextActive]}>
                    Project
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'exam' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('exam')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'exam' && styles.activityFilterTextActive]}>
                    Exam
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityFilterButton, activityFilter === 'lab_exam' && styles.activityFilterButtonActive]}
                  onPress={() => setActivityFilter('lab_exam')}
                >
                  <Text style={[styles.activityFilterText, activityFilter === 'lab_exam' && styles.activityFilterTextActive]}>
                    Lab Exam
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Filtered Activities List */}
              <FlatList
                data={content.filter(item => {
                  // Filter by activity type
                  if (item.type !== 'activity') return false;

                  // Apply activity type filter
                  if (activityFilter === 'all') return true;
                  if (activityFilter === 'quiz') return item.category === 'quiz';
                  if (activityFilter === 'assignment') return item.category === 'assignment';
                  if (activityFilter === 'lab') return item.category === 'laboratory' || item.category === 'lab';
                  if (activityFilter === 'project') return item.category === 'project';
                  if (activityFilter === 'exam') return item.category === 'major exam';
                  if (activityFilter === 'lab_exam') return item.category === 'lab exam';
                  return true;
                })}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderContentItem}
                contentContainerStyle={styles.contentList}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {activityFilter === 'all'
                      ? 'No activities yet'
                      : `No ${activityFilter.replace('_', ' ').toLowerCase()} activities yet`
                    }
                  </Text>
                }
              />
            </View>
          )}

          {/* Performance Tab - Student Performance Overview */}
          {studentTab === 'favorites' && (
            <View style={styles.favoritesContainer}>
              {performanceLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#E6B041" />
                  <Text style={styles.loadingText}>Loading your performance...</Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  style={styles.favoritesScrollView}
                  contentContainerStyle={styles.favoritesScrollContent}
                  ref={favoritesScrollViewRef}
                >
                  {/* Donut Chart - Performance Overview */}
                  <DonutChart
                    size={200}
                    data={studentPerformance}
                    centerGrade={currentGrade && currentGrade.score !== undefined ? currentGrade.score.toFixed(1) : '0.0'}
                  />

                </ScrollView>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Content Modal - Opens from FAB button */}
      <Modal
        visible={creating}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                {editingLecture ? 'Edit' : 'Create'} {contentType.toUpperCase()}
              </Text>

              <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                autoFocus
              />

              {contentType !== 'lecture' && (
                <TextInput
                  placeholder="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                />
              )}

              {/* Max Score for Activities, Quizzes, Labs, Assignments, Projects, and Exams */}
              {(contentType === 'activity' || contentType === 'quiz' || contentType === 'exam' || contentType === 'lab' || contentType === 'assignment' || contentType === 'project') && (
                <TextInput
                  placeholder="Max Score"
                  value={maxScore}
                  onChangeText={setMaxScore}
                  style={styles.input}
                  keyboardType="numeric"
                />
              )}

              {/* Term Selection for Activity, Quiz, Lab, Assignment, and Project (not for Exam) */}
              {(contentType === 'activity' || contentType === 'quiz' || contentType === 'lab' || contentType === 'assignment' || contentType === 'project') && (
                <View style={styles.typeContainer}>
                  <Text style={styles.label}>Term:</Text>
                  <View style={styles.typeButtons}>
                    <TouchableOpacity
                      style={[styles.typeButton, examTerm === 'midterm' && styles.typeButtonActive]}
                      onPress={() => setExamTerm('midterm')}
                    >
                      <Text style={[styles.typeButtonText, examTerm === 'midterm' && styles.typeButtonTextActive]}>
                        Midterm
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeButton, examTerm === 'final' && styles.typeButtonActive]}
                      onPress={() => setExamTerm('final')}
                    >
                      <Text style={[styles.typeButtonText, examTerm === 'final' && styles.typeButtonTextActive]}>
                        Final
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Exam Category and Term Selection */}
              {contentType === 'exam' && (
                <>
                  <View style={styles.typeContainer}>
                    <Text style={styles.label}>Exam Type:</Text>
                    <View style={styles.typeButtons}>
                      <TouchableOpacity
                        style={[styles.typeButton, examCategory === 'written' && styles.typeButtonActive]}
                        onPress={() => setExamCategory('written')}
                      >
                        <Text style={[styles.typeButtonText, examCategory === 'written' && styles.typeButtonTextActive]}>
                          Written
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeButton, examCategory === 'laboratory' && styles.typeButtonActive]}
                        onPress={() => setExamCategory('laboratory')}
                      >
                        <Text style={[styles.typeButtonText, examCategory === 'laboratory' && styles.typeButtonTextActive]}>
                          Laboratory
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.typeContainer}>
                    <Text style={styles.label}>Exam Term:</Text>
                    <View style={styles.typeButtons}>
                      <TouchableOpacity
                        style={[styles.typeButton, examTerm === 'midterm' && styles.typeButtonActive]}
                        onPress={() => setExamTerm('midterm')}
                      >
                        <Text style={[styles.typeButtonText, examTerm === 'midterm' && styles.typeButtonTextActive]}>
                          Midterm
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeButton, examTerm === 'final' && styles.typeButtonActive]}
                        onPress={() => setExamTerm('final')}
                      >
                        <Text style={[styles.typeButtonText, examTerm === 'final' && styles.typeButtonTextActive]}>
                          Final
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {/* Due Date Section */}
              {(contentType === 'activity' || contentType === 'quiz' || contentType === 'exam' || contentType === 'lab' || contentType === 'assignment' || contentType === 'project') && (
                <View style={styles.typeContainer}>
                  <Text style={styles.label}>Due Date:</Text>
                  <View style={styles.typeButtons}>
                    <TouchableOpacity
                      style={[styles.typeButton, { flex: 1, marginRight: 10 }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={18} color="#003366" style={{ marginRight: 5 }} />
                      <Text style={styles.typeButtonText}>
                        {dueDate ? dueDate.toLocaleDateString() : 'Set Date'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeButton, { flex: 1 }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons name="time" size={18} color="#003366" style={{ marginRight: 5 }} />
                      <Text style={styles.typeButtonText}>
                        {dueDate ? dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Set Time'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDueDate(selectedDate);
                      }}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) setDueDate(selectedDate);
                      }}
                    />
                  )}
                </View>
              )}


              {/* File Upload Section */}
              <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                <Ionicons name="document" size={20} color="#003366" />
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
                <Pressable style={[styles.btn, styles.cancel, styles.btnLeft]} onPress={closeModal}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.primary, styles.btnRight, submitting && { opacity: 0.7 }]}
                  onPress={createContent}
                  disabled={submitting}
                >
                  <Text style={[styles.btnText, { color: '#E6B041' }]}>
                    {submitting ? 'Please wait...' : (editingLecture ? 'Save' : 'Create')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Activity Submenu Modal */}
      <Modal
        visible={showActivitySubmenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivitySubmenu(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Choose Activity Type</Text>

            <TouchableOpacity
              style={styles.submenuButton}
              onPress={() => {
                setShowActivitySubmenu(false);
                handleDirectCreate('quiz');
              }}
            >
              <Ionicons name="help-circle" size={24} color="#003366" />
              <Text style={styles.submenuButtonText}>Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submenuButton}
              onPress={() => {
                setShowActivitySubmenu(false);
                handleDirectCreate('assignment');
              }}
            >
              <Ionicons name="create" size={24} color="#003366" />
              <Text style={styles.submenuButtonText}>Assignment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submenuButton}
              onPress={() => {
                setShowActivitySubmenu(false);
                handleDirectCreate('lab');
              }}
            >
              <Ionicons name="flask" size={24} color="#003366" />
              <Text style={styles.submenuButtonText}>Laboratory</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <Pressable style={[styles.btn, styles.cancel, styles.btnFull]} onPress={() => setShowActivitySubmenu(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Navigation Bar */}
      <View style={[styles.subjectTabBar, { paddingBottom: Math.max(15, insets.bottom), height: 60 + Math.max(15, insets.bottom) }]}>
        {isTeacher ? (
          <>
            {/* Tab 1: Students */}
            <TouchableOpacity
              style={styles.subjectTabItem}
              onPress={() => setSelectedTab('students')}
              activeOpacity={0.8}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="people" size={22} color={selectedTab === 'students' ? '#003366' : '#6c757d'} />
              </View>
              <Text
                style={[
                  styles.subjectTabLabel,
                  { color: selectedTab === 'students' ? '#003366' : '#6c757d' }
                ]}
                numberOfLines={1}
              >
                Students
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Content/Create */}
            <TouchableOpacity
              style={styles.subjectTabItem}
              onPress={() => {
                setSelectedTab(null); // Show content view
              }}
              activeOpacity={0.8}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="document-text" size={22} color={(selectedTab !== 'students' && selectedTab !== 'notifications') ? '#003366' : '#6c757d'} />
              </View>
              <Text
                style={[
                  styles.subjectTabLabel,
                  { color: (selectedTab !== 'students' && selectedTab !== 'notifications') ? '#003366' : '#6c757d' }
                ]}
                numberOfLines={1}
              >
                Content
              </Text>
            </TouchableOpacity>

            {/* Tab 3: Grading System */}
            <TouchableOpacity
              style={styles.subjectTabItem}
              onPress={() => setSelectedTab('notifications')}
              activeOpacity={0.8}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="speedometer" size={22} color={selectedTab === 'notifications' ? '#003366' : '#6c757d'} />
              </View>
              <Text
                style={[
                  styles.subjectTabLabel,
                  { color: selectedTab === 'notifications' ? '#003366' : '#6c757d' }
                ]}
                numberOfLines={1}
              >
                Grades
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Student Navigation - Lessons Tab */}
            <TouchableOpacity
              style={styles.subjectTabItem}
              onPress={() => setStudentTab('lessons')}
              activeOpacity={0.8}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="book" size={22} color={studentTab === 'lessons' ? '#E6B041' : '#6c757d'} />
              </View>
              <Text
                style={[
                  styles.subjectTabLabel,
                  { color: studentTab === 'lessons' ? '#E6B041' : '#6c757d' }
                ]}
                numberOfLines={1}
              >
                Lessons
              </Text>
            </TouchableOpacity>

            {/* Student Navigation - Activities Tab */}
            <TouchableOpacity
              style={styles.subjectTabItem}
              onPress={() => setStudentTab('activities')}
              activeOpacity={0.8}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="document-text" size={22} color={studentTab === 'activities' ? '#E6B041' : '#6c757d'} />
              </View>
              <Text
                style={[
                  styles.subjectTabLabel,
                  { color: studentTab === 'activities' ? '#E6B041' : '#6c757d' }
                ]}
                numberOfLines={1}
              >
                Activities
              </Text>
            </TouchableOpacity>

            {/* Student Navigation - Performance Tab */}
            <TouchableOpacity
              style={styles.subjectTabItem}
              onPress={() => setStudentTab('favorites')}
              activeOpacity={0.8}
            >
              <View style={styles.subjectIconContainer}>
                <Ionicons name="speedometer" size={22} color={studentTab === 'favorites' ? '#E6B041' : '#6c757d'} />
              </View>
              <Text
                style={[
                  styles.subjectTabLabel,
                  { color: studentTab === 'favorites' ? '#E6B041' : '#6c757d' }
                ]}
                numberOfLines={1}
              >
                Grades
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* PDF Viewer Modal */}
      <Modal
        visible={!!selectedLecture}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedLecture(null)}
      >
        <SafeAreaView style={styles.pdfModalContainer}>
          {/* Header */}
          <View style={[styles.pdfModalHeader, { backgroundColor: isTeacher ? '#003366' : '#E6B041' }]}>
            <TouchableOpacity
              style={styles.pdfCloseButton}
              onPress={() => setSelectedLecture(null)}
            >
              <Ionicons name="arrow-back" size={28} color={isTeacher ? '#E6B041' : '#003366'} />
            </TouchableOpacity>
            <Text style={[styles.pdfModalTitle, { color: isTeacher ? '#E6B041' : '#003366' }]} numberOfLines={1}>
              {selectedLecture?.title || 'Lecture'}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* PDF Viewer */}
          <View style={styles.pdfViewerContainer}>
            {selectedLecture?.file_url ? (
              <WebView
                source={{
                  uri: `https://docs.google.com/gview?embedded=true&rm=minimal&dpi=72&url=${encodeURIComponent(selectedLecture.file_url)}`
                }}
                style={styles.pdfViewer}
                onLoadStart={() => {
                  console.log('PDF loading started for:', selectedLecture.file_url);
                  setPdfLoading(true);
                }}
                onLoadEnd={() => {
                  console.log('PDF loading completed');
                  setPdfLoading(false);
                }}
                onError={(error) => {
                  console.error('PDF Loading Error:', {
                    error: error,
                    url: selectedLecture.file_url,
                    timestamp: new Date().toISOString()
                  });
                  setPdfLoading(false);
                  Alert.alert('Error Loading PDF', 'Failed to load the PDF. This may be due to file access restrictions or the file format not being supported.');
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('PDF HTTP Error:', {
                    statusCode: nativeEvent.statusCode,
                    url: nativeEvent.url,
                    timestamp: new Date().toISOString()
                  });
                  Alert.alert('Access Error', `Failed to access the PDF file (HTTP ${nativeEvent.statusCode}). The file may not be available or you don't have permission to view it.`);
                }}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.pdfLoadingContainer}>
                    <ActivityIndicator size="large" color={isTeacher ? '#003366' : '#E6B041'} />
                    <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                  </View>
                )}
                onShouldStartLoadWithRequest={(request) => {
                  // Only block explicit download requests (user click to download)
                  // Allow Google Docs viewer to load all necessary resources
                  const url = request.url.toLowerCase();

                  // Block only explicit download parameters and user-initiated downloads
                  const isExplicitDownload =
                    url.includes('?download=true') ||
                    url.includes('&download=true') ||
                    url.includes('?download=1') ||
                    url.includes('&download=1') ||
                    url.includes('force-download') ||
                    url.includes('Content-Disposition=attachment') ||
                    /[?&]dl=1(?:&|$)/.test(url);

                  if (isExplicitDownload) {
                    console.log('Blocked explicit download attempt:', request.url);
                    return false;
                  }

                  // Allow all Google Docs and Drive requests (necessary for viewer)
                  const isGoogleDomain = request.url.startsWith('https://docs.google.com/') ||
                    request.url.startsWith('https://drive.google.com/') ||
                    request.url.startsWith('https://lh.googleusercontent.com') ||
                    request.url.includes('google.com');

                  // Allow the initial Supabase file URL and other safe origins
                  const isAllowedOrigin = isGoogleDomain ||
                    request.url.startsWith('https://') ||
                    request.url.startsWith('data:');

                  if (!isAllowedOrigin) {
                    console.log('Blocking non-HTTPS request:', request.url);
                    return false;
                  }

                  return true;
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
                cachingEnabled={true}
                originWhitelist={['*']}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={true}
                allowsFullscreenVideo={false}
                allowsBackForwardNavigationGestures={false}
                allowsLinkPreview={false}
              />
            ) : (
              <View style={styles.pdfErrorContainer}>
                <Ionicons name="alert-circle" size={64} color="#dc3545" />
                <Text style={styles.pdfErrorText}>PDF not available</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsModal}>
            <View style={styles.notificationsModalHeader}>
              <Text style={styles.notificationsModalTitle}>Notifications</Text>
              <TouchableOpacity
                style={styles.notificationsModalCloseButton}
                onPress={() => setShowNotificationsModal(false)}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.notificationsModalContent}
              refreshControl={<RefreshControl refreshing={notifRefreshing} onRefresh={refreshInsideNotifications} />}
            >
              {insideNotificationsLoading ? (
                <ActivityIndicator size="large" color="#E6B041" style={{ marginTop: 40 }} />
              ) : (insideNotifications || []).length === 0 ? (
                <Text style={styles.emptyText}>No notifications yet</Text>
              ) : (
                (insideNotifications || []).map((notif) => {
                  const isRead = readNotifications.has(notif.id);
                  return (
                    <TouchableOpacity
                      key={notif.id}
                      style={[styles.notificationItem, isRead && styles.notificationItemRead]}
                      onPress={() => handleNotificationPress(notif)}
                    >
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{notif.title}</Text>
                        <Text style={styles.notificationMessage}>{notif.message}</Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {!isRead && <View style={styles.unreadIndicator} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8', // Soft light gray background so white cards pop
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
    position: 'relative',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#003366',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  activityWrapper: {
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentInfo: {
    flex: 1,
    paddingRight: 12,
  },
  contentTitle: {
    color: '#2c3e50',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contentType: {
    color: '#E6B041', // Golden Yellow
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  contentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  contentSubtext: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: '500',
  },
  submissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  submissionStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardArrow: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f8f9fa',
    justifyContent: 'center', alignItems: 'center',
  },
  arrowIcon: { fontSize: 20, color: '#6c757d', fontWeight: 'bold', marginTop: -2 },
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
    fontSize: 16,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 12,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  sectionContent: {
    minHeight: 120,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  studentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  studentProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  studentName: {
    flex: 1,
    color: '#2c3e50',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe3e3',
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e7f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#003366',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
    backgroundColor: '#003366',
    borderColor: '#003366',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  typeButtonTextActive: {
    color: '#E6B041',
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
    marginTop: 12,
    marginBottom: 8,
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
    backgroundColor: '#003366',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  btnFull: {
    width: '100%',
  },
  submenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  submenuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  floatingMenuContainer: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  floatingMenu: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    padding: 10,
    marginBottom: 10,
  },
  floatingMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    opacity: 0,
    transform: [{ translateY: 20 }],
  },
  floatingMenuItemVisible: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  floatingMenuText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  floatingMenuIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingMenuItem1: {
    backgroundColor: '#17a2b8',
  },
  floatingMenuItem2: {
    backgroundColor: '#ffc107',
  },
  floatingMenuItem3: {
    backgroundColor: '#6f42c1',
  },
  floatingMenuItem4: {
    backgroundColor: '#003366',  // Deep Navy for exam
  },
  floatingMenuItem5: {
    backgroundColor: '#dc3545',  // Red for exam
  },
  subjectTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  subjectTabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-start',
    paddingTop: 8,
    alignItems: 'center',
  },
  subjectIconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  subjectTabLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  studentContentContainer: {
    flex: 1,
  },
  activityFilterScrollView: {
    height: 65,
    flexGrow: 0,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  activityFilterContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activityFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activityFilterButtonActive: {
    backgroundColor: '#E6B041',
    borderColor: '#E6B041',
  },
  activityFilterText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 14,
  },
  activityFilterTextActive: {
    color: '#003366',
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
    backgroundColor: '#003366',
    borderColor: '#003366',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c757d',
    letterSpacing: 0.5,
  },
  filterButtonTextActive: {
    color: '#E6B041',
  },
  // PDF Viewer Styles
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 0,
  },
  pdfModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#003366',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 0,
  },
  pdfCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#E6B041',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  pdfViewer: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  pdfErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  pdfErrorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  pdfLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  contentSubtext: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  submissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  submissionStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  contentThumbActive: {
    backgroundColor: '#FFF9E6',
  },
  notificationItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E6B041',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationItemRead: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#ccc',
    opacity: 0.7,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc3545',
    marginLeft: 12,
    marginTop: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  // Notifications Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    height: '90%',
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  notificationsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  notificationsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  notificationsModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  notificationsModalContent: {
    flex: 1,
    padding: 20,
  },
  // Enhanced notification item styles for full view
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#003366',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationItemRead: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#ccc',
    opacity: 0.7,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    backgroundColor: '#dc3545',
    borderRadius: 5,
    marginTop: 4,
  },
  // Grading System Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  gradedSubmissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gradedSubmissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradedActivityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gradedSubmissionInfo: {
    flex: 1,
  },
  gradedActivityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 4,
  },
  gradedActivityType: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  gradedScoreContainer: {
    alignItems: 'flex-end',
  },
  gradedScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
  },
  gradedPercentage: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  gradedSubmissionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradedStudentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradedStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#003366',
    marginLeft: 6,
  },
  gradedSubmissionDate: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  gradedSubmissionContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#003366',
  },
  gradedContentLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 4,
  },
  gradedContentText: {
    fontSize: 14,
    color: '#003366',
    lineHeight: 20,
  },
  // Simple Grading System Styles
  simpleGradedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  simpleGradedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simpleStudentName: {
    flex: 2,
    fontSize: 16,
    fontWeight: '700',
    color: '#003366',
    letterSpacing: 0.5,
  },
  simpleFinalGrade: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#003366',
    textAlign: 'right',
  },
  // Student Performance Overview Styles
  currentGradeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#003366',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentGradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 12,
    textAlign: 'center',
  },
  gradeDisplay: {
    alignItems: 'center',
  },
  gradePercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  gradeLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  noGradeText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  performanceSection: {
    paddingHorizontal: 4,
    flex: 1,
  },
  performanceList: {
    flex: 1,
    paddingBottom: 20,
  },
  performanceHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
  },
  scrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#003366',
  },
  scrollButtonText: {
    fontSize: 12,
    color: '#003366',
    fontWeight: '600',
    marginLeft: 4,
  },
  noPerformanceText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  performanceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceActivityTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginRight: 12,
  },
  performanceScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  performanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  performanceCategory: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  performanceScoreDetail: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  performanceDate: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  // Favorites Tab Styles
  favoritesContainer: {
    flex: 1,
    height: '100%',
  },
  favoritesScrollView: {
    flex: 1,
    height: '100%',
  },
  favoritesScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  // Donut Chart Styles
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#003366',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  donutWrapper: {
    alignItems: 'center',
    marginBottom: 0,
  },
  donutBase: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutBackground: {
    backgroundColor: '#f8f9fa',
    position: 'absolute',
  },
  donutRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  donutHole: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  centerGrade: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
  },
  centerLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  legendCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#003366',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 16,
    textAlign: 'center',
  },
  legendContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  legendPercentage: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
});