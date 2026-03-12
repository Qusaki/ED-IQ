import apiClient from './apiConfig';
import { contentService } from './contentService';
import { subjectService } from './subjectService';
import storage from './storage';

const READ_NOTIFS_KEY = 'ed_iq_read_notifications';

// Store for tracking read generated notifications locally
const readGeneratedNotifications = new Set();

// Store for tracking read inside notifications locally (subject-specific notifications)
const readInsideNotificationsStore = new Set();

// Global shared read notifications state (used by both main and subject detail screens)
let globalReadNotifications = new Set();

// Store for app session start time to filter notifications
let appSessionStartTime = null;

// Cache for expensive API calls
let _teacherNotifCache = null;
let _teacherNotifCacheTime = 0;
const TEACHER_CACHE_TTL = 8000; // 8 seconds

let _backendNotifCache = null;
let _backendNotifCacheTime = 0;
const BACKEND_CACHE_TTL = 5000; // 5 seconds

// Helper function to get date from X days ago
const getDaysAgoDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Frontend-only notification aggregator. Does not change backend.
export const notificationService = {
  // Fetch backend-persisted notifications for current user
  async getBackendNotifications(skipCache = false) {
    try {
      const now = Date.now();
      if (!skipCache && _backendNotifCache && (now - _backendNotifCacheTime) < BACKEND_CACHE_TTL) {
        return _backendNotifCache;
      }
      const res = await apiClient.get('/notification');
      _backendNotifCache = res.data || [];
      _backendNotifCacheTime = Date.now();
      return _backendNotifCache;
    } catch (err) {
      console.warn('Failed to fetch backend notifications:', err?.response?.data || err.message);
      return _backendNotifCache || [];
    }
  },

  // Mark a single backend notification as read
  async markAsRead(id) {
    if (!id) return false;

    // Use the global state management functions
    this.addToGlobalReadNotifications(id);

    // Check if this is a generated notification
    if (id.startsWith('gen-')) {
      // Store in local set for generated notifications
      readGeneratedNotifications.add(id);
      // Also trigger global state
      this.addToGlobalReadNotifications(id);

      // Also try to mark it on backend if it's a real notification
      try {
        await apiClient.put(`/notification/${id}/read`);
      } catch (e) {
        // Ignore if backend doesn't recognize generated notification ID
      }
      this.persistReadNotifications();
      return true;
    }

    // Check if this is an inside notification (subject-specific)
    if (id.startsWith('submission-') || id.startsWith('enroll-')) {
      // Store in local set for inside notifications
      readInsideNotificationsStore.add(id);
      // Also trigger global state
      this.addToGlobalReadNotifications(id);

      // Also try to mark it on backend if it's a real notification
      try {
        await apiClient.put(`/notification/${id}/read`);
      } catch (e) {
        // Ignore if backend doesn't recognize inside notification ID
      }
      this.persistReadNotifications();
      return true;
    }

    try {
      // Execute backend call but don't strictly block local persistence if it fails
      apiClient.put(`/notification/${id}/read`).catch(e => {
        console.warn('Backend markAsRead for', id, 'failed silently:', e.message);
      });
      // Always persist locally for consistency
      this.persistReadNotifications();
      return true;
    } catch (err) {
      console.warn('Failed to mark notification as read:', id, err?.response?.data || err.message);
      this.persistReadNotifications();
      return false;
    }
  },

  // Persist read notifications to storage
  async persistReadNotifications() {
    try {
      const ids = Array.from(globalReadNotifications);
      await storage.setItem(READ_NOTIFS_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to persist read notifications:', e);
    }
  },

  // Load read notifications from storage
  async loadReadNotifications() {
    try {
      const stored = await storage.getItem(READ_NOTIFS_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          ids.forEach(id => globalReadNotifications.add(id));
          console.log('Loaded', ids.length, 'read notifications from storage');
        }
      }
    } catch (e) {
      console.error('Failed to load read notifications:', e);
    }
  },

  // Get read inside notifications
  getReadInsideNotifications() {
    return new Set(readInsideNotificationsStore);
  },

  // Get read generated notifications
  getReadGeneratedNotifications() {
    return new Set(readGeneratedNotifications);
  },

  // Get global shared read notifications
  getGlobalReadNotifications() {
    if (!globalReadNotifications) {
      console.error('globalReadNotifications is undefined in getGlobalReadNotifications');
      return new Set();
    }
    return new Set(globalReadNotifications);
  },

  // Add to global read notifications
  addToGlobalReadNotifications(id) {
    if (globalReadNotifications) {
      globalReadNotifications.add(id);
    } else {
      console.error('globalReadNotifications is undefined in addToGlobalReadNotifications');
    }
  },

  // Set global read notifications (for initialization)
  setGlobalReadNotifications(ids) {
    globalReadNotifications = new Set(ids);
  },

  // Mark inside notification as read
  markInsideNotificationAsRead(id) {
    if (id) {
      readInsideNotificationsStore.add(id);
    }
  },

  // Clear all notifications on app refresh (for teachers)
  clearAllNotificationsOnRefresh() {
    // Set session start time to current time
    appSessionStartTime = new Date().toISOString();
    // Clear only temporary inside store, NOT the permanent readGenerated/global lists
    // unless we want a full reset. User asked for permanent, so we keep them.
    readInsideNotificationsStore.clear();
    console.log('Set app session start time and cleared inside notification store:', appSessionStartTime);
  },

  // Get app session start time
  getAppSessionStartTime() {
    return appSessionStartTime;
  },

  // Get a single notification by ID
  async getNotification(id) {
    try {
      const res = await apiClient.get(`/notification/${id}`);
      return res.data || null;
    } catch (err) {
      return null;
    }
  },

  // Mark many notifications as read
  async markManyAsRead(ids = []) {
    try {
      const tasks = (ids || []).map((id) => this.markAsRead(id));
      await Promise.all(tasks);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Build "inside" notifications for a specific subject (submissions + pending enrollments)
  async getSubjectNotifications(subjectId) {
    try {
      console.log('Building inside notifications for subject:', subjectId);
      const backendNotifs = await this.getBackendNotifications();
      
      const notifications = backendNotifs.filter(n => n.subject_id === subjectId).map(n => ({
        ...n,
        source: 'backend',
        type: n.title.endsWith(' - Request') ? 'enrollment_request' : 
              n.title.endsWith(' - New Submission') ? 'submission' : 'notification'
      }));

      // Sort newest first
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('Final inside notifications:', notifications.length, 'items');
      return notifications;
    } catch (err) {
      console.error('Error building subject notifications:', err);
      return [];
    }
  },

  // Build a generalized notification list for teacher's global notifications screen
  // This merges backend notifications with generated ones from all teacher subjects
  async getGeneralNotificationsForTeacher(limitSubjects = 10, skipCache = false) {
    try {
      // Return cached result if still fresh
      const now = Date.now();
      if (!skipCache && _teacherNotifCache && (now - _teacherNotifCacheTime) < TEACHER_CACHE_TTL) {
        return _teacherNotifCache;
      }

      const backend = await this.getBackendNotifications();
      let teacherSubjects = [];

      try {
        teacherSubjects = await subjectService.listMySubjects();
      } catch (e) {
         console.warn("Failed to load generic teacher subjects");
      }

      // Helper map to quickly find subject by name for inference
      const subjectNameMap = {};
      const subjectIdMap = {};
      (teacherSubjects || []).forEach(s => {
        subjectNameMap[s.name] = s.id;
        subjectIdMap[s.id] = s.name;
      });

      // Merge lists, backend first, then generated; convert backend items to consistent shape
      const mappedBackend = (backend || []).map((b) => {
        let inferredSubjectId = b.subject_id || null;
        let inferredSubjectName = b.subject_name || (inferredSubjectId ? subjectIdMap[inferredSubjectId] : null);
        let mappedType = 'notification';

        // Infer subject details for backend enrollment request notifications
        if (b.title && b.title.endsWith(' - Request')) {
          mappedType = 'enrollment_request';
        }

        // Infer activity details for backend submission notifications
        if (b.title && b.title.endsWith(' - New Submission')) {
          mappedType = 'submission';
        }

        return {
          id: b.id,
          type: mappedType,
          title: b.title,
          message: b.message,
          created_at: b.created_at,
          is_read: b.is_read,
          subject_id: inferredSubjectId,
          subject_name: inferredSubjectName,
          activity_id: b.activity_id,
          lecture_id: b.lecture_id,
          source: 'backend',
        };
      });

      const filtered = mappedBackend.filter(n => {
        if (!globalReadNotifications) {
          console.error('globalReadNotifications is undefined in filtering');
          return true; // Show all if global state is not available
        }
        return n.source !== 'generated' || !globalReadNotifications.has(n.id);
      });
      console.log('Final filtered notifications:', filtered.length, 'items');
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      _teacherNotifCache = filtered;
      _teacherNotifCacheTime = Date.now();
      return filtered;
    } catch (err) {
      console.error('Error building general notifications:', err);
      return _teacherNotifCache || [];
    }
  },
};