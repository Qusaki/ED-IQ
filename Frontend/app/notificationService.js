import apiClient from './apiConfig';
import { contentService } from './contentService';
import { subjectService } from './subjectService';

// Store for tracking read generated notifications locally
const readGeneratedNotifications = new Set();

// Store for tracking read inside notifications locally (subject-specific notifications)
const readInsideNotificationsStore = new Set();

// Global shared read notifications state (used by both main and subject detail screens)
let globalReadNotifications = new Set();

// Store for app session start time to filter notifications
let appSessionStartTime = null;

// Helper function to get date from X days ago
const getDaysAgoDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Frontend-only notification aggregator. Does not change backend.
export const notificationService = {
  // Fetch backend-persisted notifications for current user
  async getBackendNotifications() {
    try {
      const res = await apiClient.get('/notification');
      return res.data || [];
    } catch (err) {
      console.warn('Failed to fetch backend notifications:', err?.response?.data || err.message);
      return [];
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
      // Also try to mark it on backend if it's a real notification
      try {
        await apiClient.put(`/notification/${id}/read`);
      } catch (e) {
        // Ignore if backend doesn't recognize generated notification ID
      }
      return true;
    }

    // Check if this is an inside notification (subject-specific)
    if (id.startsWith('submission-') || id.startsWith('enroll-')) {
      // Store in local set for inside notifications
      readInsideNotificationsStore.add(id);
      // Also try to mark it on backend if it's a real notification
      try {
        await apiClient.put(`/notification/${id}/read`);
      } catch (e) {
        // Ignore if backend doesn't recognize inside notification ID
      }
      return true;
    }

    try {
      await apiClient.put(`/notification/${id}/read`);
      return true;
    } catch (err) {
      console.warn('Failed to mark notification as read:', id, err?.response?.data || err.message);
      return false;
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
    // Clear all local notification stores
    readGeneratedNotifications.clear();
    readInsideNotificationsStore.clear();
    console.log('Set app session start time and cleared notification stores:', appSessionStartTime);
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

      // For each activity, get submissions and create notifications
      for (const activity of activities || []) {
        try {
          const submissions = await contentService.getSubmissions(activity.id);
          console.log('Processing activity:', activity.title, 'category:', activity.category);
          (submissions || []).forEach((submission) => {
            // Only include submissions from last 7 days for better visibility
            const sevenDaysAgo = getDaysAgoDate(7);
            if (new Date(submission.created_at) > sevenDaysAgo) {
              // Determine activity type for the message
              let activityType = 'Activity';
              if (activity.category === 'quiz') {
                activityType = 'Quiz';
              } else if (activity.category === 'assignment') {
                activityType = 'Assignment';
              } else if (activity.category === 'laboratory') {
                activityType = 'Laboratory';
              } else if (activity.category === 'major exam') {
                activityType = 'Exam';
              } else if (activity.category === 'lab exam') {
                activityType = 'Laboratory Exam';
              } else if (activity.category === 'project') {
                activityType = 'Project';
              }

              const message = `A Student Submitted a Answer to ${activityType}`;
              console.log('Creating notification with message:', message);

              notifications.push({
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
            } else {
              console.log('Skipping old submission from:', submission.created_at);
            }
          });
        } catch (e) {
          console.warn(`Failed to load submissions for activity ${activity.id}:`, e);
        }
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
  async getGeneralNotificationsForTeacher(limitSubjects = 10) {
    try {
      console.log('Building general notifications for teacher...');
      const backend = await this.getBackendNotifications();
      console.log('Backend notifications:', backend?.length || 0, 'items');

      // Get teacher subjects (if endpoint available)
      let generated = [];
      try {
        const subjects = await subjectService.listMySubjects();
        console.log('Teacher subjects:', subjects?.length || 0, 'items');
        const toProcess = (subjects || []).slice(0, limitSubjects);

        for (const subj of toProcess) {
          console.log('Processing subject:', subj.name);
          // Recent enrollments
          try {
            const students = await subjectService.getSubjectStudents(subj.id);
            const pending = (students || []).filter((s) => s.status === 'pending' || s.status === 'PENDING');
            console.log('Pending enrollments for', subj.name, ':', pending.length);
            pending.forEach((p) => {
              // Only include enrollments from last 7 days
              const sevenDaysAgo = getDaysAgoDate(7);
              if (new Date(p.created_at) > sevenDaysAgo) {
                generated.push({
                  id: `gen-enroll-${subj.id}-${p.id}`,
                  type: 'enrollment_request',
                  subject_id: subj.id,
                  subject_name: subj.name,
                  title: 'Enrollment Request',
                  message: `${p.name || p.email} requested to join ${subj.name}`,
                  created_at: p.created_at || new Date().toISOString(),
                  source: 'generated',
                  is_read: false, // Always show as unread until handled
                });
              }
            });
          } catch (e) {
            console.log('No enrollments for', subj.name, ':', e.message);
          }

          // Recent submissions: check last activity submissions
          try {
            const activities = await contentService.getActivities(subj.id);
            console.log('Activities for', subj.name, ':', activities?.length || 0, 'items');
            const actSample = (activities || []).slice(0, 5);
            for (const act of actSample) {
              try {
                const subs = await contentService.getSubmissions(act.id);
                console.log('Submissions for', act.title, ':', subs?.length || 0, 'items');
                (subs || []).forEach((s) => {
                  // Only include submissions from last 7 days
                  const sevenDaysAgo = getDaysAgoDate(7);
                  if (new Date(s.created_at) > sevenDaysAgo) {
                    // Determine activity type for the message
                    let activityType = 'Activity';
                    if (act.category === 'quiz') {
                      activityType = 'Quiz';
                    } else if (act.category === 'assignment') {
                      activityType = 'Assignment';
                    } else if (act.category === 'laboratory') {
                      activityType = 'Laboratory';
                    } else if (act.category === 'major exam') {
                      activityType = 'Exam';
                    } else if (act.category === 'lab exam') {
                      activityType = 'Laboratory Exam';
                    } else if (act.category === 'project') {
                      activityType = 'Project';
                    }

                    generated.push({
                      id: `gen-sub-${s.id}`,
                      type: 'submission',
                      subject_id: subj.id,
                      subject_name: subj.name,
                      activity_id: act.id,
                      activity_title: act.title,
                      title: 'New Submission',
                      message: `A Student Submitted a Answer to ${activityType}`,
                      created_at: s.created_at,
                      source: 'generated',
                      is_read: false, // Always show as unread until reviewed
                    });
                  }
                });
              } catch (e) {
                console.log('No submissions for', act.title, ':', e.message);
              }
            }
          } catch (e) {
            console.log('No activities for', subj.name, ':', e.message);
          }
        }
      } catch (e) {
        console.warn('Unable to load teacher subjects, skipping generated notifications', e.message || e);
      }

      console.log('Generated notifications:', generated.length, 'items');

      // Merge lists, backend first, then generated; convert backend items to consistent shape
      const mappedBackend = (backend || []).map((b) => ({
        id: b.id,
        type: 'backend',
        title: b.title,
        message: b.message,
        created_at: b.created_at,
        is_read: b.is_read,
        source: 'backend',
      }));

      const merged = [...mappedBackend, ...generated];
      // Filter out generated notifications that have been marked as read using global state
      const filtered = merged.filter(n => {
        if (!globalReadNotifications) {
          console.error('globalReadNotifications is undefined in filtering');
          return true; // Show all if global state is not available
        }
        return n.source !== 'generated' || !globalReadNotifications.has(n.id);
      });
      console.log('Final filtered notifications:', filtered.length, 'items');
      console.log('Global read notifications count:', globalReadNotifications ? globalReadNotifications.size : 'undefined');
      console.log('Generated notifications being filtered:', globalReadNotifications ? generated.filter(n => globalReadNotifications.has(n.id)).length : 'undefined');
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return filtered;
    } catch (err) {
      console.error('Error building general notifications:', err);
      return [];
    }
  },
};
