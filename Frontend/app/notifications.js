import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import CustomTabBar from '../components/CustomTabBar';
import { notificationService } from './notificationService';
import { subjectService } from './subjectService';
import { contentService } from './contentService';
import RBACManager from './rbacManager';

// Cache for student notifications
let _studentNotifCache = null;
let _studentNotifCacheTime = 0;
const STUDENT_CACHE_TTL = 8000; // 8 seconds

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);

  const [generalNotifications, setGeneralNotifications] = useState([]);
  const [tab, setTab] = useState('general');
  const [readNotifications, setReadNotifications] = useState(new Set());

  const loadForStudent = useCallback(async (silent = false) => {
    // 1) Check cache first
    const now = Date.now();
    if (!silent && _studentNotifCache && (now - _studentNotifCacheTime) < STUDENT_CACHE_TTL) {
      setGeneralNotifications(_studentNotifCache);
      return;
    }

    // 2) Get backend notifications
    const backend = await notificationService.getBackendNotifications();

    // 2) Keep new posts (Lecture/Activity) AND grading notifications
    const relevantNotifs = (backend || []).filter((n) => {
      if ((n?.title === 'New Lecture' || n?.title === 'New Activity') && typeof n?.message === 'string' && n.message.includes(' has been posted')) {
        return true;
      }
      if ((n?.title === 'Submission Scored' || n?.title === 'Offline Submission Scored') && typeof n?.message === 'string') {
        return true;
      }
      return false;
    });

    // 3) Build map from content title -> subject name across the student's subjects
    let subjects = [];
    try {
      subjects = await subjectService.listMySubjects();
    } catch (e) {
      subjects = [];
    }

    const titleToContent = {};
    await Promise.all((subjects || []).map(async (subj) => {
      try {
        const [lectures, activities] = await Promise.all([
          contentService.getLectures(subj.id),
          contentService.getActivities(subj.id),
        ]);
        (lectures || []).forEach((lec) => {
          titleToContent[lec.title] = { subjectName: subj.name, subjectId: subj.id, id: lec.id, type: 'lecture' };
        });
        (activities || []).forEach((act) => {
          titleToContent[act.title] = { subjectName: subj.name, subjectId: subj.id, id: act.id, type: 'activity' };
        });
      } catch (e) {
        // ignore
      }
    }));

    // 4) Convert to simplified student-facing list with subject name
    const simplified = relevantNotifs.map((n) => {
      let subjectName = null;
      let displayMessage = n.message;
      let displayTitle = n.title;

      if (n.title === 'New Lecture' || n.title === 'New Activity') {
        const postedTitle = n.message.replace(/ has been posted\.?$/i, '');
        const contentInfo = titleToContent[postedTitle];
        subjectName = contentInfo?.subjectName;
        displayTitle = subjectName || 'New Post';
        displayMessage = n.title === 'New Lecture' ? 'New Lecture posted' : 'New Activity posted';

        if (contentInfo) {
          if (contentInfo.type === 'lecture') {
            n.lecture_id = contentInfo.id;
          } else {
            n.activity_id = contentInfo.id;
            n.activity_title = postedTitle;
          }
        }
      } else if (n.title === 'Submission Scored' || n.title === 'Offline Submission Scored') {
        // Extract the activity title from message: Your submission for 'Activity 1' has been scored...
        const match = n.message.match(/for '(.*?)' has been scored/);
        if (match && match[1]) {
          const activityTitle = match[1];
          const contentInfo = titleToContent[activityTitle];
          subjectName = contentInfo?.subjectName;
          if (contentInfo) {
            n.activity_id = contentInfo.id;
            n.activity_title = activityTitle;
          }
        }
        displayTitle = subjectName ? `${subjectName} - Graded` : 'Submission Graded';
        // Keep the original message which contains the score
        displayMessage = n.message;
      }

      // Find the subject ID
      const subjectId = n.subject_id || subjects.find(s => s.name === subjectName)?.id;

      return {
        id: n.id,
        title: displayTitle,
        message: displayMessage,
        created_at: n.created_at,
        subject_id: subjectId,
        activity_id: n.activity_id,
        activity_title: n.activity_title,
        lecture_id: n.lecture_id,
        is_read: n.is_read, // Keep the read state from backend
      };
    });

    // 5) Sort newest first
    simplified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Update Cache
    _studentNotifCache = simplified;
    _studentNotifCacheTime = Date.now();

    setGeneralNotifications(simplified);
  }, []);

  const loadForTeacher = useCallback(async () => {
    console.log('Loading teacher notifications...');
    const merged = await notificationService.getGeneralNotificationsForTeacher();
    console.log('Loaded teacher notifications:', merged?.length || 0, 'items');
    console.log('Notification details:', merged);

    // Sync with global read state before setting notifications
    const globalReadIds = notificationService.getGlobalReadNotifications();
    setReadNotifications(globalReadIds);

    setGeneralNotifications(merged || []);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const currentRole = await RBACManager.getCurrentUserRole();
      setRole(currentRole);

      // For teachers, preserve read state from persistence
      if (currentRole === 'teacher') {
        const persistedReadIds = notificationService.getGlobalReadNotifications();
        setReadNotifications(persistedReadIds);
      }

      // Now load notifications after read state is set
      if (currentRole === 'teacher') {
        await loadForTeacher();
      } else {
        await loadForStudent(silent);
      }
    } catch (err) {
      if (!silent) console.warn('Failed to load notifications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadForStudent, loadForTeacher]);

  // Initial load with persistence
  useEffect(() => {
    const init = async () => {
      await notificationService.loadReadNotifications();
      await load();
    };
    init();

    const intervalId = setInterval(() => {
      load(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [load]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshNotifications = async () => {
        try {
          await load(true); // Silent load on focus
        } catch (error) {
          console.warn('Failed to refresh notifications on focus:', error);
        }
      };

      refreshNotifications();
    }, [load])
  );

  // Additional focus effect to sync with global state
  useFocusEffect(
    useCallback(() => {
      if (role === 'teacher') {
        // Sync with global read state whenever screen comes into focus
        const globalReadIds = notificationService.getGlobalReadNotifications();
        setReadNotifications(globalReadIds);
        console.log('Synced main notifications with global state:', globalReadIds.size);
      }
    }, [role])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAsRead = (notificationId) => {
    console.log('Marking notification as read:', notificationId);

    // Update global shared state
    notificationService.addToGlobalReadNotifications(notificationId);

    // Update local state for immediate UI update
    setReadNotifications(prev => {
      const newSet = new Set([...prev, notificationId]);
      console.log('Updated read notifications set:', newSet.size);
      return newSet;
    });
  };

  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Update unread count when notifications change
  useEffect(() => {
    if (role === 'teacher') {
      const unread = generalNotifications.filter(n => !readNotifications.has(n.id)).length;
      console.log('Unread count calculation:', {
        total: generalNotifications.length,
        read: readNotifications.size,
        unread: unread
      });
      setUnreadCount(unread);
    } else {
      // For students, check both backend read state and local read notifications
      const unread = generalNotifications.filter(n =>
        !readNotifications.has(n.id) && n.is_read !== true && n.is_read !== 1
      ).length;
      setUnreadCount(unread);
    }
  }, [generalNotifications, readNotifications, role]);

  const handleNotificationPress = async (notification) => {
    const currentRole = await RBACManager.getCurrentUserRole();

    // Mark as read if not already read (Now for both teachers and students)
    if (!readNotifications.has(notification.id)) {
      await notificationService.markAsRead(notification.id);
      markAsRead(notification.id);
    }

    // Determine if it's an enrollment request (Teacher)
    const isEnrollmentRequest =
      (currentRole === 'teacher' && notification.type === 'enrollment_request') ||
      (currentRole === 'teacher' && notification.title?.toLowerCase()?.includes('request'));

    // Determine if it's a submission (Teacher)
    const isSubmission =
      (currentRole === 'teacher' && notification.type === 'submission') ||
      (currentRole === 'teacher' && notification.title?.toLowerCase()?.includes('submission'));

    // Deep linking for teacher notifications
    if (currentRole === 'teacher') {
      if (isSubmission && notification.activity_id) {
        // Find the activity type to route correctly (ActivityDetail needs activity type)
        let actType = 'Activity';
        if (notification.title) {
          const lowerTitle = notification.title.toLowerCase();
          if (lowerTitle.includes('quiz')) actType = 'Quiz';
          else if (lowerTitle.includes('assignment')) actType = 'Assignment';
          else if (lowerTitle.includes('laboratory') || lowerTitle.includes('lab')) actType = 'Laboratory';
          else if (lowerTitle.includes('exam')) actType = 'Exam';
          else if (lowerTitle.includes('project')) actType = 'Project';
        }

        // Push directly to ActivityDetail
        router.push({
          pathname: '/screens/ActivityDetail',
          params: {
            activityId: notification.activity_id,
            isTeacher: 'true',
            subjectId: notification.subject_id,
            type: actType,
            activityTitle: notification.activity_title,
          },
        });
        return;
      } else if (isEnrollmentRequest) {
        // Route to Subject detail but straight to students tab
        router.push({
          pathname: '/screens/SubjectDetail',
          params: {
            subjectId: notification.subject_id,
            initialTab: 'students',
          },
        });
        return;
      }
    }

    // Deep linking for student notifications
    if (currentRole !== 'teacher') {
      if (notification.activity_id) {
        let actType = 'Activity';
        if (notification.title) {
          const lowerTitle = notification.title.toLowerCase();
          if (lowerTitle.includes('quiz')) actType = 'Quiz';
          else if (lowerTitle.includes('assignment')) actType = 'Assignment';
          else if (lowerTitle.includes('laboratory') || lowerTitle.includes('lab')) actType = 'Laboratory';
          else if (lowerTitle.includes('exam')) actType = 'Exam';
          else if (lowerTitle.includes('project')) actType = 'Project';
        }

        router.push({
          pathname: '/screens/ActivityDetail',
          params: {
            activityId: notification.activity_id,
            isStudent: 'true',
            subjectId: notification.subject_id,
            type: actType,
            activityTitle: notification.activity_title,
          },
        });
        return;
      } else if (notification.lecture_id) {
        router.push({
          pathname: '/screens/SubjectDetail',
          params: {
            subjectId: notification.subject_id,
            initialTab: 'lessons',
          },
        });
        return;
      }
    }

    // Default: Navigate to the subject if it's a student notification or regular teacher notification
    if (notification.subject_id) {
      router.push({
        pathname: '/screens/SubjectDetail',
        params: {
          subjectId: notification.subject_id,
        },
      });
    }
  };

  const renderNotification = (n) => {
    const isRead = readNotifications.has(n.id) || n.is_read === true || n.is_read === 1;

    return (
      <TouchableOpacity
        key={n.id}
        style={[
          styles.notificationItem,
          isRead ? styles.notificationRead : null
        ]}
        onPress={() => handleNotificationPress(n)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{n.title || 'New Update'}</Text>
          <Text style={styles.notificationText}>{n.message}</Text>
          <Text style={styles.notificationTime}>
            {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
          </Text>
        </View>
        {!isRead && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NOTIFICATIONS</Text>

        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setTab('general')}
            style={[styles.tabButton, tab === 'general' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'general' && styles.tabTextActive]}>
              General {`(${generalNotifications.filter(n => !readNotifications.has(n.id) && n.is_read !== true && n.is_read !== 1).length})`}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

          {tab === 'general' && (
            <View>
              {(generalNotifications || []).length === 0 ? (
                <Text style={styles.emptyText}>No notifications</Text>
              ) : (
                (generalNotifications || []).map((n) => renderNotification(n))
              )}
            </View>
          )}
        </ScrollView>
      </View >
      <CustomTabBar unreadNotificationCount={unreadCount} />
    </View >
  );
}

const styles = StyleSheet.create({
  notificationContent: {
    flex: 1,
  },
  unreadIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
  },
  notificationRead: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  unreadCountText: {
    textAlign: 'right',
    color: '#dc3545',
    fontSize: 14,
    marginBottom: 10,
    marginRight: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingBottom: 120,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#32cd32',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: '#f0f0f0',
  },
  tabActive: {
    backgroundColor: '#32cd32',
  },
  tabText: {
    color: '#333',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    paddingRight: 40,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
    paddingRight: 16,
  },
  notificationText: {
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
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
  },
  subjectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectIndicatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#28a745',
    letterSpacing: 0.5,
  },
  subjectDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  notificationBadge: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  notificationBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});