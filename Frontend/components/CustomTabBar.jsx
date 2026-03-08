import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RBACManager from '../app/rbacManager';
import { useRBAC } from '../app/RBACComponents';
import { notificationService } from '../app/notificationService';

export default function CustomTabBar({ unreadNotificationCount = 0 }) {
  const { isTeacher } = useRBAC();
  const insets = useSafeAreaInsets();
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
          items = items.filter((n) =>
            n?.title === 'New Lecture' ||
            n?.title === 'New Activity' ||
            n?.title === 'Submission Scored' ||
            n?.title === 'Offline Submission Scored'
          );
          const unread = items.filter((n) => n && n.is_read !== true && n.is_read !== 1);
          if (mounted) setInternalUnread(unread.length);
        } else {
          // For teachers, we need to get the same notifications as the notifications screen
          try {
            const merged = await notificationService.getGeneralNotificationsForTeacher();
            const globalReadIds = notificationService.getGlobalReadNotifications();
            const unread = (merged || []).filter(n => {
              if (n.is_read === true || n.is_read === 1) return false;
              if (globalReadIds.has(n.id)) return false;
              return true;
            });
            if (mounted) setInternalUnread(unread.length);
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
            items = items.filter((n) =>
              n?.title === 'New Lecture' ||
              n?.title === 'New Activity' ||
              n?.title === 'Submission Scored' ||
              n?.title === 'Offline Submission Scored'
            );
            const unread = items.filter((n) => n && n.is_read !== true && n.is_read !== 1);
            setInternalUnread(unread.length);
          } else {
            const merged = await notificationService.getGeneralNotificationsForTeacher();
            const globalReadIds = notificationService.getGlobalReadNotifications();
            const unread = (merged || []).filter(n => {
              if (n.is_read === true || n.is_read === 1) return false;
              if (globalReadIds.has(n.id)) return false;
              return true;
            });
            setInternalUnread(unread.length);
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

  // Only render on main tab routes to prevent overlap on stack screens
  const mainRoutes = ['/', '/index', '/notifications', '/profile'];
  if (!mainRoutes.includes(pathname)) {
    return null;
  }

  return (
    <View style={[styles.tabBar, {
      paddingBottom: Math.max(15, insets.bottom),
      height: 60 + Math.max(15, insets.bottom)
    }]}>
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
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={tab.icon}
                size={22}
                color={active ? (isTeacher ? '#003366' : '#E6B041') : '#6c757d'}
              />
              {tab.name === 'notifications' && displayCount > 0 && (
                <View style={[
                  styles.notificationBadge,
                  { backgroundColor: isTeacher ? '#003366' : '#E6B041' }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: isTeacher ? '#E6B041' : '#003366' }
                  ]}>
                    {displayCount > 99 ? '99+' : displayCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: active ? (isTeacher ? '#003366' : '#E6B041') : '#6c757d' }
              ]}
              numberOfLines={1}
            >
              {tab.label === 'Home' ? 'Dashboard' : tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-start',
    paddingTop: 8,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
});