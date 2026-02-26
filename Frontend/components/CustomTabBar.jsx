import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import RBACManager from '../app/rbacManager';
import { notificationService } from '../app/notificationService';

export default function CustomTabBar({ unreadNotificationCount = 0 }) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalUnread, setInternalUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const role = await RBACManager.getCurrentUserRole();
        
        // For students, count individual notifications
        if (role !== 'teacher') {
          const backend = await notificationService.getBackendNotifications();
          let items = Array.isArray(backend) ? backend : [];
          items = items.filter((n) => n?.title === 'New Lecture' || n?.title === 'New Activity');
          const unread = items.filter((n) => n && n.is_read !== true && n.is_read !== 1);
          if (mounted) setInternalUnread(unread.length);
        } else {
          // For teachers, we need to get the same notifications as the notifications screen
          try {
            const merged = await notificationService.getGeneralNotificationsForTeacher();
            // Group by subject and count subjects with unread notifications
            const grouped = {};
            (merged || []).forEach((notif) => {
              const subjectName = notif.subject_name || notif.subjectName || 'General';
              if (!grouped[subjectName]) {
                grouped[subjectName] = [];
              }
              grouped[subjectName].push(notif);
            });
            
            // Count subjects that have unread notifications
            const subjectsWithUnread = Object.keys(grouped).filter(subjectName => 
              grouped[subjectName].some(n => n.is_read !== true && n.is_read !== 1)
            ).length;
            
            if (mounted) setInternalUnread(subjectsWithUnread);
          } catch (e) {
            // Fallback: try backend notifications
            const backend = await notificationService.getBackendNotifications();
            const items = Array.isArray(backend) ? backend : [];
            const unread = items.filter((n) => n && n.is_read !== true && n.is_read !== 1);
            if (mounted) setInternalUnread(unread.length);
          }
        }
      } catch (e) {
        if (mounted) setInternalUnread(0);
      }
    };
    
    load();
    const id = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshNotifications = async () => {
        try {
          const role = await RBACManager.getCurrentUserRole();
          
          if (role !== 'teacher') {
            const backend = await notificationService.getBackendNotifications();
            let items = Array.isArray(backend) ? backend : [];
            items = items.filter((n) => n?.title === 'New Lecture' || n?.title === 'New Activity');
            const unread = items.filter((n) => n && n.is_read !== true && n.is_read !== 1);
            setInternalUnread(unread.length);
          } else {
            const merged = await notificationService.getGeneralNotificationsForTeacher();
            const grouped = {};
            (merged || []).forEach((notif) => {
              const subjectName = notif.subject_name || notif.subjectName || 'General';
              if (!grouped[subjectName]) {
                grouped[subjectName] = [];
              }
              grouped[subjectName].push(notif);
            });
            
            const subjectsWithUnread = Object.keys(grouped).filter(subjectName => 
              grouped[subjectName].some(n => n.is_read !== true && n.is_read !== 1)
            ).length;
            
            setInternalUnread(subjectsWithUnread);
          }
        } catch (e) {
          setInternalUnread(0);
        }
      };
      
      refreshNotifications();
    }, [])
  );

  const tabs = [
    {
      name: 'index',
      icon: 'home',
      label: 'Home',
    },
    {
      name: 'notifications',
      icon: 'notifications',
      label: 'Notifications',
    },
    {
      name: 'profile',
      icon: 'person',
      label: 'Profile',
    },
  ];

  const handleTabPress = (tabName) => {
    console.log('Tab pressed:', tabName);
    console.log('Current pathname:', pathname);
    
    try {
      if (tabName === 'index') {
        router.navigate('/');
      } else {
        router.navigate(`/${tabName}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to push method
      if (tabName === 'index') {
        router.push('/');
      } else {
        router.push(`/${tabName}`);
      }
    }
  };

  const isActive = (tabName) => {
    if (tabName === 'index') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname === `/${tabName}`;
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = isActive(tab.name);
        const onNotificationsTab = isActive('notifications');
        const displayCount = onNotificationsTab
          ? (Number.isFinite(unreadNotificationCount) ? unreadNotificationCount : 0)
          : internalUnread;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={1}
          >
            <View style={[
              styles.iconContainer,
              active && styles.activeIconContainer
            ]}>
              <Ionicons
                name={tab.icon}
                size={24}
                color={active ? '#28a745' : '#6c757d'}
              />
              {tab.name === 'notifications' && displayCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{displayCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f4',
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
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 24,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});