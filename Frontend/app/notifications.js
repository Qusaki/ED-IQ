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

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);

  const [generalNotifications, setGeneralNotifications] = useState([]);
  const [tab, setTab] = useState('general');
  const [readNotifications, setReadNotifications] = useState(new Set());

  const loadForStudent = useCallback(async () => {
    // 1) Get backend notifications
    const backend = await notificationService.getBackendNotifications();

    // 2) Keep only new posts (Lecture/Activity)
    const newPostNotifs = (backend || []).filter((n) =>
      (n?.title === 'New Lecture' || n?.title === 'New Activity') &&
      typeof n?.message === 'string' && n.message.includes(' has been posted')
    );

    // 3) Build map from content title -> subject name across the student's subjects
    let subjects = [];
    try {
      subjects = await subjectService.listMySubjects();
    } catch (e) {
      subjects = [];
    }

    const titleToSubject = {};
    await Promise.all((subjects || []).map(async (subj) => {
      try {
        const [lectures, activities] = await Promise.all([
          contentService.getLectures(subj.id),
          contentService.getActivities(subj.id),
        ]);
        (lectures || []).forEach((lec) => { titleToSubject[lec.title] = subj.name; });
        (activities || []).forEach((act) => { titleToSubject[act.title] = subj.name; });
      } catch (e) {
        // ignore
      }
    }));

    // 4) Convert to simplified student-facing list with subject name
    const simplified = newPostNotifs.map((n) => {
      const postedTitle = n.message.replace(/ has been posted\.?$/i, '');
      const subjectName = titleToSubject[postedTitle];
      
      // Find the subject ID from the subjects list
      const subjectId = subjects.find(s => s.name === subjectName)?.id;
      
      return {
        id: n.id,
        title: subjectName || 'New Post',
        message: n.title === 'New Lecture' ? 'New Lecture posted' : 'New Activity posted',
        created_at: n.created_at,
        subject_id: subjectId,
        is_read: n.is_read, // Keep the read state from backend
      };
    });

    // 5) Sort newest first
    simplified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const currentRole = await RBACManager.getCurrentUserRole();
      setRole(currentRole);

      // For teachers, preserve read state from both backend and generated notifications
      if (currentRole === 'teacher') {
        // Don't clear generated notifications - preserve them like Student Interface
        // notificationService.clearAllNotificationsOnRefresh();
        
        // Get backend notifications and preserve their read state FIRST
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
        
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Now load notifications after read state is set
      if (currentRole === 'teacher') {
        await loadForTeacher();
      } else {
        await loadForStudent();
      }
    } catch (err) {
      console.warn('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [loadForStudent, loadForTeacher]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshNotifications = async () => {
        try {
          await load();
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
    // For teachers, DON'T mark as read when navigating from General Notifications
    // Only mark as read when actually clicked inside the subject
    if (role !== 'teacher') {
      // Mark as read if not already read (for students)
      if (!readNotifications.has(notification.id)) {
        await notificationService.markAsRead(notification.id);
        markAsRead(notification.id);
      }
    }

    // Navigate to the subject if it's a student notification or teacher navigating to subject
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
    const isRead = role === 'teacher' 
      ? readNotifications.has(n.id)
      : readNotifications.has(n.id) || n.is_read === true || n.is_read === 1;
    
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

  // Group notifications by subject for teachers
  const groupNotificationsBySubject = () => {
    const grouped = {};
    (generalNotifications || []).forEach((notif) => {
      const subjectName = notif.subject_name || 'General';
      if (!grouped[subjectName]) {
        grouped[subjectName] = [];
      }
      grouped[subjectName].push(notif);
    });
    return grouped;
  };

  const renderTeacherNotifications = () => {
    const grouped = groupNotificationsBySubject();
    const subjects = Object.keys(grouped);

    if (subjects.length === 0) {
      return <Text style={styles.emptyText}>No notifications</Text>;
    }

    return (
      <View>
        {subjects.map((subjectName) => {
          const subjectNotifications = grouped[subjectName];
          const unreadCount = subjectNotifications.filter(n => !readNotifications.has(n.id)).length;
          console.log(`Subject "${subjectName}":`, {
            total: subjectNotifications.length,
            unread: unreadCount,
            readIds: Array.from(readNotifications.values()),
            notificationIds: subjectNotifications.map(n => n.id)
          });
          return (
            <TouchableOpacity 
              key={subjectName} 
              style={styles.subjectIndicator}
              onPress={async () => {
                console.log(`Clicking subject "${subjectName}" with ${unreadCount} unread notifications`);
                // Navigate to the subject without marking as read
                // Inside notifications will be marked as read only when explicitly clicked
                const subjectNotif = grouped[subjectName][0];
                if (subjectNotif && subjectNotif.subject_id) {
                  router.push({
                    pathname: '/screens/SubjectDetail',
                    params: { 
                      subjectId: subjectNotif.subject_id,
                    },
                  });
                }
              }}
            >
              <Text style={styles.subjectIndicatorName}>{subjectName}</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>+{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
              General {role === 'teacher' && `(${generalNotifications.filter(n => !readNotifications.has(n.id)).length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#32cd32" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

            {tab === 'general' && (
              <View>
                {role === 'teacher' ? (
                  renderTeacherNotifications()
                ) : (
                  (generalNotifications || []).length === 0 ? (
                    <Text style={styles.emptyText}>No notifications</Text>
                  ) : (
                    (generalNotifications || []).map((n) => renderNotification(n))
                  )
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
      <CustomTabBar unreadNotificationCount={unreadCount} />
    </View>
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
