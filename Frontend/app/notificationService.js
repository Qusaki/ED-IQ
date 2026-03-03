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
      const notifications = [];

      // Fetch activities for subject
      const activities = await contentService.getActivities(subjectId);
      console.log('Found activities:', activities?.length || 0, 'for subject');

      // For each activity, get submissions in parallel
      const activityPromises = (activities || []).map(async (activity) => {
        let actNotifications = [];
        try {
          const submissions = await contentService.getSubmissions(activity.id);
          console.log('Processing activity:', activity.title, 'category:', activity.category);
          (submissions || []).forEach((submission) => {
            // Only include submissions from last 7 days for better visibility
            const sevenDaysAgo = getDaysAgoDate(7);
            if (new Date(submission.created_at) > sevenDaysAgo) {
              // Determine activity type for the message
              let activityType = 'Activity';
              if (activity.category === 'quiz') activityType = 'Quiz';
              else if (activity.category === 'assignment') activityType = 'Assignment';
              else if (activity.category === 'laboratory') activityType = 'Laboratory';
              else if (activity.category === 'major exam') activityType = 'Exam';
              else if (activity.category === 'lab exam') activityType = 'Laboratory Exam';
              else if (activity.category === 'project') activityType = 'Project';

              const message = `A Student Submitted a Answer to ${activityType}`;

              actNotifications.push({
                id: `gen-sub-${submission.id}`, // Use same ID format as general notifications
                type: 'submission',
                activity_id: activity.id,
                activity_title: activity.title,
                student_id: submission.student_id,
                student_name: submission.student_name,
                student_email: submission.student_email,
                created_at: submission.created_at,
                message: message,
                source: 'generated', // Add source for proper filtering
              });
            }
          });
        } catch (e) {
          console.warn(`Failed to load submissions for activity ${activity.id}:`, e);
        }
        return actNotifications;
      });

      const allActivityNotifications = await Promise.all(activityPromises);
      allActivityNotifications.forEach(actNotifs => {
        notifications.push(...actNotifs);
      });

      // Fetch pending enrollments for this subject
      try {
        const students = await subjectService.getSubjectStudents(subjectId);
        const pending = (students || []).filter(s => s.status?.toLowerCase() === 'pending');

        pending.forEach(p => {
          notifications.push({
            id: `gen-enroll-${subjectId}-${p.id}`,
            type: 'enrollment_request',
            subject_id: subjectId,
            student_id: p.id,
            student_name: p.name || p.email,
            created_at: p.created_at || new Date().toISOString(),
            title: 'Enrollment Request',
            message: `${p.name || p.email} wants to enroll in this subject`,
            source: 'generated'
          });
        });
      } catch (e) {
        console.warn('Failed to load pending students for internal notifications:', e);
      }

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

      // Get teacher subjects (if endpoint available)
      let generated = [];
      let teacherSubjects = [];
      try {
        const subjects = await subjectService.listMySubjects();
        teacherSubjects = subjects;
        const toProcess = (subjects || []).slice(0, limitSubjects);

        const subjectPromises = toProcess.map(async (subj) => {
          let subjGenerated = [];

          try {
            // Fetch students and activities in parallel
            const [students, activities] = await Promise.all([
              subjectService.getSubjectStudents(subj.id).catch(() => []),
              contentService.getActivities(subj.id).catch(() => [])
            ]);

            // Process enrollments
            const pending = (students || []).filter((s) => s.status === 'pending' || s.status === 'PENDING');
            pending.forEach((p) => {
              const sevenDaysAgo = getDaysAgoDate(7);
              const requestDate = p.created_at ? new Date(p.created_at) : new Date();
              if (requestDate > sevenDaysAgo) {
                subjGenerated.push({
                  id: `gen-enroll-${subj.id}-${p.id}`,
                  type: 'enrollment_request',
                  subject_id: subj.id,
                  subject_name: subj.name,
                  title: `${subj.name} - Request`,
                  message: `${p.name || p.email} wants to enroll`,
                  created_at: p.created_at || new Date().toISOString(),
                  source: 'generated',
                  is_read: false,
                });
              }
            });

            // Process activities and submissions in parallel
            const actSample = (activities || []).slice(0, 5);
            const submissionPromises = actSample.map(async (act) => {
              const subs = await contentService.getSubmissions(act.id).catch(() => []);
              const actSubsGenerated = [];
              (subs || []).forEach((s) => {
                const sevenDaysAgo = getDaysAgoDate(7);
                if (new Date(s.created_at) > sevenDaysAgo) {
                  let activityType = 'Activity';
                  if (act.category === 'quiz') activityType = 'Quiz';
                  else if (act.category === 'assignment') activityType = 'Assignment';
                  else if (act.category === 'laboratory') activityType = 'Laboratory';
                  else if (act.category === 'major exam') activityType = 'Exam';
                  else if (act.category === 'lab exam') activityType = 'Laboratory Exam';
                  else if (act.category === 'project') activityType = 'Project';

                  actSubsGenerated.push({
                    id: `gen-sub-${s.id}`,
                    type: 'submission',
                    subject_id: subj.id,
                    subject_name: subj.name,
                    activity_id: act.id,
                    activity_title: act.title,
                    title: `${subj.name} - New Submission`,
                    message: `${s.student_name || 'A student'} submitted an answer to ${activityType}: "${act.title}"`,
                    created_at: s.created_at,
                    source: 'generated',
                    is_read: false,
                  });
                }
              });
              return actSubsGenerated;
            });

            const allActSubs = await Promise.all(submissionPromises);
            allActSubs.forEach(acts => {
              subjGenerated.push(...acts);
            });

          } catch (e) {
            console.log('Error processing subject', subj.name, ':', e.message);
          }

          return subjGenerated;
        });

        const allGeneratedArrays = await Promise.all(subjectPromises);
        allGeneratedArrays.forEach(arr => {
          generated.push(...arr);
        });
      } catch (e) {
        console.warn('Unable to load teacher subjects, skipping generated notifications', e.message || e);
      }

      console.log('Generated notifications:', generated.length, 'items');

      // Helper map to quickly find subject by name for inference
      const subjectNameMap = {};
      (teacherSubjects || []).forEach(s => {
        subjectNameMap[s.name] = s.id;
      });

      // Merge lists, backend first, then generated; convert backend items to consistent shape
      const mappedBackend = (backend || []).map((b) => {
        let inferredSubjectId = b.subject_id || null;
        let inferredSubjectName = b.subject_name || null;
        let mappedType = 'backend';

        // Infer subject details for backend enrollment request notifications
        if (b.title && b.title.endsWith(' - Request')) {
          mappedType = 'enrollment_request';
          const possibleSubjectName = b.title.replace(' - Request', '');
          if (!inferredSubjectId && subjectNameMap[possibleSubjectName]) {
            inferredSubjectId = subjectNameMap[possibleSubjectName];
            inferredSubjectName = possibleSubjectName;
          }
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
          source: 'backend',
        };
      });

      // Deduplicate: remove backend enrollment notifications if we already
      // have a generated enrollment notification for the same subject
      const generatedSubjectIds = new Set(
        generated.filter(n => n.type === 'enrollment_request').map(n => n.subject_id)
      );
      const dedupedBackend = mappedBackend.filter(b => {
        // Keep backend notification if it's NOT an enrollment duplicate
        if (b.type === 'enrollment_request' && b.subject_id && generatedSubjectIds.has(b.subject_id)) {
          return false; // Skip duplicate
        }
        if (b.title && b.title.toLowerCase().includes('enroll') && b.subject_id && generatedSubjectIds.has(b.subject_id)) {
          return false; // Skip duplicate
        }
        return true;
      });

      const merged = [...dedupedBackend, ...generated];
      // Filter out generated notifications that have been marked as read using global state
      const filtered = merged.filter(n => {
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