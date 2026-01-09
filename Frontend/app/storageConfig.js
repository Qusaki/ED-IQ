/**
 * Storage Configuration Module
 * 
 * This module centralizes all storage bucket configuration.
 * Instead of hardcoding bucket names, we use environment variables.
 */

// Get storage configuration from environment variables
export const getStorageConfig = () => {
  return {
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
      bucket: process.env.EXPO_PUBLIC_SUPABASE_BUCKET || 'ed-iq-storage',
    },
    gcp: {
      projectId: process.env.EXPO_PUBLIC_GCP_PROJECT_ID,
      bucketName: process.env.EXPO_PUBLIC_GCP_BUCKET_NAME,
    },
  };
};

/**
 * Get the appropriate bucket name based on the storage provider
 * @param {string} provider - 'supabase' or 'gcp'
 * @returns {string} The bucket name
 */
export const getBucketName = (provider = 'supabase') => {
  const config = getStorageConfig();
  
  if (provider === 'gcp') {
    return config.gcp.bucketName;
  }
  
  return config.supabase.bucket;
};

/**
 * Format a display name for the bucket
 * @param {string} provider - 'supabase' or 'gcp'
 * @returns {string} A formatted display name
 */
export const getBucketDisplayName = (provider = 'supabase') => {
  const bucket = getBucketName(provider);
  if (!bucket) return 'Storage';
  
  // Convert bucket name to display format
  // e.g., "ed-iq-storage" becomes "ED-IQ Storage"
  return bucket
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get file storage path with proper categorization
 * @param {string} fileType - 'lecture', 'activity', 'submission', 'student-handbook'
 * @param {string} fileName - The original file name
 * @returns {string} The path where the file should be stored
 */
export const getStoragePath = (fileType, fileName) => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  const paths = {
    lecture: `lectures/${timestamp}_${sanitizedFileName}`,
    activity: `activities/${timestamp}_${sanitizedFileName}`,
    submission: `submissions/${timestamp}_${sanitizedFileName}`,
    'student-handbook': `handbooks/Student Handbook.pdf`,
    default: `uploads/${timestamp}_${sanitizedFileName}`,
  };
  
  return paths[fileType] || paths.default;
};

export default getStorageConfig;
