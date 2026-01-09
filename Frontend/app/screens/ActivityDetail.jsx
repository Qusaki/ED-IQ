import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { contentService } from '../contentService';
import { subjectService } from '../subjectService';
import { useRBAC } from '../RBACComponents';
import { fileMetadataService } from '../fileMetadataService';
import * as DocumentPicker from 'expo-document-picker';

export default function ActivityDetail() {
  const router = useRouter();
  const { activity: activityString, subjectId: routeSubjectId, subjectName } = useLocalSearchParams();
  const { isStudent, isTeacher } = useRBAC();
  const [activity, setActivity] = useState(null);
  const [subjectId, setSubjectId] = useState(routeSubjectId);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState('');
  const [file, setFile] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingMode, setGradingMode] = useState(false);
  const [grading, setGrading] = useState({});
  const [showSubmittedPopup, setShowSubmittedPopup] = useState(false);
  const [studentNames, setStudentNames] = useState({});
  const [studentSubmissionData, setStudentSubmissionData] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [submissionPreviewUrl, setSubmissionPreviewUrl] = useState(null);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [filePreviewTitle, setFilePreviewTitle] = useState('');
  const [showFullScreenFileModal, setShowFullScreenFileModal] = useState(false);
  const [fullScreenFileUrl, setFullScreenFileUrl] = useState(null);
  const [fullScreenFileTitle, setFullScreenFileTitle] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const submissionTimeoutRef = useRef(null);
  const offlineGradingScrollRef = useRef(null);
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);
  const [editSubmissionText, setEditSubmissionText] = useState('');
  const [editSubmissionFile, setEditSubmissionFile] = useState(null);
  const [isEditingTeacherSubmission, setIsEditingTeacherSubmission] = useState(null);
  const [editTeacherText, setEditTeacherText] = useState('');
  const [editTeacherFile, setEditTeacherFile] = useState(null);
  const [showActivityEditMenu, setShowActivityEditMenu] = useState(false);
  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [editActivityTitle, setEditActivityTitle] = useState('');
  const [editActivityDescription, setEditActivityDescription] = useState('');
  const [editActivityFile, setEditActivityFile] = useState(null);
  const [fileNameCache, setFileNameCache] = useState({}); // Cache for fetched filenames
  
    // Function to get submission file URL
  const getSubmissionFileUrl = (submission) => {
    if (!submission) return null;
    
    console.log('Checking submission for file URL:', submission.id || 'unknown');
    
    // Check for direct URL properties
    const directUrl = submission.file_url || submission.fileURL || submission.fileUrl;
    if (directUrl) {
      console.log('Found direct URL:', directUrl);
      return directUrl;
    }
    
    // Check for nested file object with URL
    if (submission.file) {
      console.log('Checking file object:', submission.file);
      if (typeof submission.file === 'string') {
        return submission.file;
      }
      if (submission.file.url) return submission.file.url;
      if (submission.file.uri) return submission.file.uri;
    }
    
    // Check for attachments array
    if (submission.attachments && submission.attachments.length > 0) {
      const attachment = submission.attachments[0];
      const attachmentUrl = attachment.url || attachment.file_url || attachment.uri;
      if (attachmentUrl) return attachmentUrl;
    }
    
    // Check for files array
    if (submission.files && submission.files.length > 0) {
      const file = submission.files[0];
      const fileUrl = file.url || file.file_url || file.uri;
      if (fileUrl) return fileUrl;
    }
    
    // Check for image field specifically (for image submissions)
    if (submission.image) {
      console.log('Found image field:', submission.image);
      if (typeof submission.image === 'string') {
        return submission.image;
      }
      if (submission.image.url || submission.image.uri) {
        return submission.image.url || submission.image.uri;
      }
    }
    
    // Check for content field that might be an image URL
    if (submission.content && typeof submission.content === 'string' && 
        (submission.content.startsWith('http') || 
         submission.content.match(/\.(jpg|jpeg|png|gif|bmp|webp|heic|heif)$/i))) {
      console.log('Found image URL in content:', submission.content);
      return submission.content;
    }
    
    // Check for answer field that might contain image (Quiz specific)
    if (submission.answer) {
      console.log('Checking answer field:', submission.answer);
      if (typeof submission.answer === 'string' && 
          (submission.answer.startsWith('http') || 
           submission.answer.match(/\.(jpg|jpeg|png|gif|bmp|webp|heic|heif)$/i))) {
        console.log('Found image URL in answer:', submission.answer);
        return submission.answer;
      }
    }
    
    // Check for submission_data field (Quiz specific)
    if (submission.submission_data) {
      console.log('Checking submission_data:', submission.submission_data);
      const data = submission.submission_data;
      if (typeof data === 'string') {
        if (data.startsWith('http') || data.match(/\.(jpg|jpeg|png|gif|bmp|webp|heic|heif)$/i)) {
          return data;
        }
      }
      if (data.file_url || data.fileURL || data.fileUrl) {
        return data.file_url || data.fileURL || data.fileUrl;
      }
      if (data.image) {
        if (typeof data.image === 'string') return data.image;
        if (data.image.url || data.image.uri) return data.image.url || data.image.uri;
      }
    }
    
    console.log('No file URL found in submission');
    return null;
  };

  const getFileNameFromUrl = async (url) => {
    if (!url) return 'Document';
    
    // Check if we already have this filename cached
    if (fileNameCache[url]) {
      return fileNameCache[url];
    }
    
    try {
      // Extract the stored filename from the URL
      const storedFileName = fileMetadataService.extractStoredFileName(url);
      
      if (!storedFileName) {
        console.warn('Could not extract stored filename from URL');
        return 'Document';
      }

      // Fetch metadata from backend to get original filename
      const result = await fileMetadataService.getFileMetadata(storedFileName);
      
      let fileName = 'Document';
      
      if (result.success && result.metadata.original_name) {
        fileName = result.metadata.original_name;
        console.log('Retrieved original filename from metadata:', fileName);
      } else {
        // Fallback to extracting from URL if metadata fetch fails
        console.warn('Failed to get metadata, using fallback extraction');
        const decoded = decodeURIComponent(url.split('?')[0]);
        const marker = '/object/public/';
        const pathPortion = decoded.includes(marker)
          ? decoded.split(marker)[1]
          : decoded;
        const segments = pathPortion.split('/');
        fileName = segments.pop() || segments.pop() || 'Document';

        if (!fileName) fileName = 'Document';

        // Extract original filename from stored name (last part after underscore)
        const parts = fileName.split('_');
        if (parts.length > 1) {
          fileName = parts[parts.length - 1];
        }

        fileName = fileName.replace(/\+/g, ' ');
      }
      
      // Cache the filename for future use
      setFileNameCache(prev => ({
        ...prev,
        [url]: fileName
      }));
      
      return fileName;
    } catch (error) {
      console.error('Error extracting filename:', error);
      return 'Document';
    }
  };
  
  // Synchronous wrapper for immediate fallback - returns cached value or placeholder
  const getFileNameSync = (url) => {
    if (!url) return 'Document';
    return fileNameCache[url] || 'Loading...';
  };

  // Memoized prefetch effect to prevent constant re-renders
  const prefetchFileNamesCallback = React.useCallback(async () => {
    const urlsToPrefetch = [];
    
    // Add activity file URL
    if (activity?.file_url && !fileNameCache[activity.file_url]) {
      urlsToPrefetch.push(activity.file_url);
    }
    
    // Add submission file URLs
    if (submissions && submissions.length > 0) {
      submissions.forEach(sub => {
        if (sub.file_url && !fileNameCache[sub.file_url]) {
          urlsToPrefetch.push(sub.file_url);
        }
      });
    }
    
    // Add student submission file URL
    if (studentSubmissionData?.file_url && !fileNameCache[studentSubmissionData.file_url]) {
      urlsToPrefetch.push(studentSubmissionData.file_url);
    }
    
    // Prefetch all URLs in parallel
    if (urlsToPrefetch.length > 0) {
      try {
        await Promise.all(
          urlsToPrefetch.map(url => 
            getFileNameFromUrl(url).catch(error => 
              console.error('Error prefetching filename for:', url, error)
            )
          )
        );
      } catch (error) {
        console.error('Error during filename prefetch:', error);
      }
    }
  }, [activity?.file_url, submissions?.length, studentSubmissionData?.file_url]);

  // Call the prefetch callback when URLs change
  useEffect(() => {
    prefetchFileNamesCallback();
  }, [prefetchFileNamesCallback]);

  const getDocumentViewerUrl = (url) => {
    if (!url) return null;
    try {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    } catch (error) {
      console.log('Failed to build viewer url:', url, error);
      return url;
    }
  };

  // Function to block download requests and force inline viewing
  const blockDownloads = (request) => {
    if (!request || !request.url) return true;
    
    const url = request.url.toLowerCase();
    
    // Skip if this is a navigation to 'about:blank' or empty URL
    if (url === 'about:blank') return true;
    
    // Check for download indicators in the URL
    const isDownload = 
      url.includes('download') || 
      /[?&]download=1(?:&|$)/.test(url) ||
      /[?&]download=true(?:&|$)/.test(url) ||
      url.includes('force-download') ||
      url.includes('content-disposition=attachment') ||
      /\b(?:pdf|docx?|xlsx?|zip|rar|7z|exe|dmg|pkg)(?:[?#]|$)/i.test(url);
    
    if (isDownload) {
      console.log('Blocking download attempt:', url);
      
      // For Google Docs/Drive, force the viewer
      if (url.includes('docs.google.com') || url.includes('drive.google.com')) {
        const viewerUrl = url.includes('?') 
          ? `${url}&embedded=true&rm=minimal` 
          : `${url}?embedded=true&rm=minimal`;
        
        // Update the URL without causing a re-render
        if (url !== viewerUrl) {
          setFilePreviewUrl(viewerUrl);
        }
      }
      
      return false;
    }
    return true;
  };
  
  // Memoized function to get WebView source with forced inline viewing
  const getWebViewSource = React.useCallback((url) => {
    if (!url) return null;
    
    console.log('Processing URL for WebView:', url);
    
    // For PDF files and documents, use Google Docs viewer
    if (url.toLowerCase().includes('.pdf') || 
        url.toLowerCase().includes('.doc') || 
        url.toLowerCase().includes('.docx') || 
        url.toLowerCase().includes('.xls') || 
        url.toLowerCase().includes('.xlsx') || 
        url.toLowerCase().includes('.ppt') || 
        url.toLowerCase().includes('.pptx')) {
      
      // Use Google Docs viewer for all document types with better parameters
      const googleDocsUrl = `https://docs.google.com/gview?embedded=true&rm=minimal&dpi=72&url=${encodeURIComponent(url)}`;
      console.log('Using Google Docs viewer URL:', googleDocsUrl);
      return { uri: googleDocsUrl };
    }
    
    // Add parameters to force inline viewing for Google Docs/Drive
    let processedUrl = url;
    if (url.includes('docs.google.com') || url.includes('drive.google.com')) {
      // Remove any existing download parameters
      processedUrl = url
        .replace(/[?&]download=1(?:&|$)/, '$1')
        .replace(/[?&]download=true(?:&|$)/, '$1')
        .replace(/[?&]force-download(?:&|$)/, '$1');
      
      // Add viewer parameters if not already present
      if (!processedUrl.includes('embedded=true')) {
        processedUrl = processedUrl.includes('?') 
          ? `${processedUrl}&embedded=true&rm=minimal` 
          : `${processedUrl}?embedded=true&rm=minimal`;
      }
    }
    
    console.log('Final WebView URL:', processedUrl);
    return { 
      uri: processedUrl,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      }
    };
  }, []);

  const studentFileUrl = studentSubmissionData
    ? getSubmissionFileUrl(studentSubmissionData)
    : null;

  const isImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      const cleaned = url.split('?')[0];
      const extension = cleaned.split('.').pop();
      return /(png|jpe?g|gif|bmp|webp|heic|heif)$/i.test(extension || '');
    } catch (error) {
      console.log('Failed to determine if URL is image:', url, error);
      return false;
    }
  };

  const isPdfUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      const cleaned = url.split('?')[0];
      const extension = cleaned.split('.').pop();
      return /(pdf)$/i.test(extension || '');
    } catch (error) {
      console.log('Failed to determine if URL is pdf:', url, error);
      return false;
    }
  };

  const openSubmissionModal = async (submission) => {
    console.log('Opening submission modal for:', submission);
    setModalLoading(true);
    setSubmissionPreviewUrl(null);
    setShowSubmissionModal(true);

    try {
      // Always use the submission data we have first
      let fullSubmission = submission;
      
      // Only fetch full submission details if we don't have the file URL
      if (!getSubmissionFileUrl(submission)) {
        console.log('Fetching full submission details...');
        fullSubmission = await contentService.getSubmissionById(submission.id);
        console.log('Loaded full submission details:', fullSubmission);
      }
      
      setSelectedSubmission(fullSubmission || submission);
      const fileUrl = getSubmissionFileUrl(fullSubmission || submission);
      console.log('File URL for preview:', fileUrl);
      
      if (fileUrl) {
        // Ensure the URL is properly formatted
        const formattedUrl = fileUrl.startsWith('http') ? fileUrl : `https:${fileUrl}`;
        console.log('Setting submission preview URL:', formattedUrl);
        setSubmissionPreviewUrl(formattedUrl);
      } else {
        console.warn('No file URL found for submission:', fullSubmission || submission);
      }
    } catch (error) {
      console.error('Error loading full submission:', error);
      setSelectedSubmission(submission);
      Alert.alert('Error', 'Unable to load submission details. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const closeSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedSubmission(null);
    setSubmissionPreviewUrl(null);
    setModalLoading(false);
  };

  const openFilePreviewModal = (url) => {
    if (!url) return;
    setFilePreviewUrl(url);
    setShowFilePreviewModal(true);
  };

  const onShouldStartLoadWithRequest = (request) => {
    // Block any requests that look like file downloads
    const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.exe', '.dmg', '.pkg'];
    const isDownload = downloadExtensions.some(ext => request.url.toLowerCase().includes(ext));
    
    if (isDownload) {
      Alert.alert(
        'View Only',
        'Files can only be viewed within the app for security reasons.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Only allow navigation within the current domain
    const isAllowed = request.url.startsWith('https://docs.google.com/') || 
                     request.url.startsWith('https://drive.google.com/');
    if (!isAllowed) {
      // Block external navigation to prevent downloads
      console.log('Blocking external navigation to:', request.url);
      return false;
    }
    return true;
  };

  const closeFilePreviewModal = () => {
    setShowFilePreviewModal(false);
    setFilePreviewUrl(null);
    setFilePreviewTitle('');
  };

  const openFullScreenFile = (fileUrl, title = 'Document') => {
    console.log('Opening full-screen file:', fileUrl, 'with title:', title);
    if (!fileUrl) {
      console.error('No file URL provided to openFullScreenFile');
      Alert.alert('Error', 'No file available to view.');
      return;
    }
    setFullScreenFileUrl(fileUrl);
    setFullScreenFileTitle(title);
    setShowFullScreenFileModal(true);
  };

  const closeFullScreenFileModal = () => {
    setShowFullScreenFileModal(false);
    setFullScreenFileUrl(null);
    setFullScreenFileTitle('');
    setPdfLoading(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setFile({
          uri: result.uri,
          name: result.name,
          type: result.mimeType,
        });
        return;
      }

      if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
        const asset = result.assets[0];
        setFile({
          uri: asset.uri,
          name: asset.name || asset.fileName || asset.uri?.split('/')?.pop() || 'uploaded-file',
          type: asset.mimeType || asset.type || 'application/octet-stream',
        });
        return;
      }

      if (result.type === 'cancel') {
        setFile(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
    };
  }, []);

  // Load submission status
  const loadSubmissionStatus = async () => {
    if (!activity) return;

    try {
      if (isStudent) {
        // Load student's submission status
        const status = await contentService.getSubmissionStatus(activity.id);
        setSubmissionStatus(status);

        // Load existing submission if any
        const existingSubmission = await contentService.getOwnSubmission(activity.id);
        console.log('Student existing submission:', existingSubmission);
        if (existingSubmission) {
          setSubmission(existingSubmission.content || '');
          setFile(
            existingSubmission.file_url
              ? {
                  uri: existingSubmission.file_url,
                  name: getFileNameFromUrl(existingSubmission.file_url) || 'Submitted Document',
                  type: 'application/octet-stream',
                }
              : null
          );
          setStudentSubmissionData(existingSubmission);
          console.log('Student submission data set with file URL:', existingSubmission?.file_url);
        } else {
          setStudentSubmissionData(null);
        }
      } else if (isTeacher) {
        const allSubmissions = await contentService.getSubmissions(activity.id);
        console.log('Quiz submissions loaded:', allSubmissions?.length || 0, 'submissions');
        
        // Debug: Show first submission structure for Quiz activities
        if (activity.category === 'quiz' && allSubmissions?.length > 0) {
          console.log('=== QUIZ SUBMISSION DEBUG ===');
          console.log('First Quiz submission structure:', allSubmissions[0]);
          console.log('All submission keys:', Object.keys(allSubmissions[0]));
          console.log('Submission data types:', {
            file_url: typeof allSubmissions[0]?.file_url,
            file: typeof allSubmissions[0]?.file,
            image: typeof allSubmissions[0]?.image,
            content: typeof allSubmissions[0]?.content,
            answer: typeof allSubmissions[0]?.answer,
            submission_data: typeof allSubmissions[0]?.submission_data,
            attachments: typeof allSubmissions[0]?.attachments,
            files: typeof allSubmissions[0]?.files,
          });
          console.log('=== END QUIZ DEBUG ===');
        }
        
        setSubmissions(allSubmissions);

        if (allSubmissions.length > 0) {
          console.log('Loading student names for submissions');
          await loadStudentNames(allSubmissions);
        } else {
          setStudentNames({});
        }
      }
    } catch (error) {
      console.error('Error loading submission status:', error);
    }
  };

  // Load student names for teacher view
  const loadStudentNames = async (submissions) => {
    try {
      const names = {};
      const studentIds = [...new Set(submissions.map((sub) => sub.student_id))];

      console.log('Student IDs from submissions:', studentIds);

      if (studentIds.length > 0) {
        try {
          console.log('Fetching enrolled students for subject:', subjectId);
          const enrolledStudents = await subjectService.getSubjectStudents(subjectId);
          console.log('Enrolled students:', enrolledStudents);

          enrolledStudents.forEach((student) => {
            const key = student?.student_id || student?.id;
            if (key && (!student.status || student.status === 'approved')) {
              names[key] =
                student.name ||
                student.email ||
                `Student ${key.slice(-6)}`;
            }
          });
        } catch (error) {
          console.error('Error fetching enrolled students:', error);
        }
      }

      submissions.forEach((sub, index) => {
        if (!names[sub.student_id]) {
          const fallbackName =
            sub?.student_email?.split?.('@')[0] ||
            (sub.student_id ? `Student ${sub.student_id.slice(-6)}` : null) ||
            `Student ${index + 1}`;
          names[sub.student_id] = fallbackName;
        }
      });

      console.log('Final student names mapping:', names);
      setStudentNames(names);
    } catch (error) {
      console.error('Error loading student names:', error);
      const fallbackNames = {};
      submissions.forEach((sub, index) => {
        fallbackNames[sub.student_id] = `Student ${index + 1}`;
      });
      setStudentNames(fallbackNames);
    }
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!submission.trim() && !file) {
      Alert.alert('Error', 'Please provide a response or upload a file.');
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        content: submission.trim() || null,
        file: file || null
      };

      console.log('Submitting activity with data:', {
        hasContent: !!submissionData.content,
        hasFile: !!submissionData.file,
        fileName: submissionData.file?.name,
        fileType: submissionData.file?.type,
        fileUri: submissionData.file?.uri,
      });

      await contentService.submitActivity(activity.id, submissionData);
      
      // Update submission status
      const status = await contentService.getSubmissionStatus(activity.id);
      setSubmissionStatus(status);

      const latestSubmission = await contentService.getOwnSubmission(activity.id);
      console.log('Latest submission fetched after submit:', latestSubmission);
      setStudentSubmissionData(latestSubmission);
      
      // Show submitted popup and navigate back after a short delay
      setShowSubmittedPopup(true);

      // Clear form
      setSubmission('');
      setFile(null);

      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }

      submissionTimeoutRef.current = setTimeout(() => {
        setShowSubmittedPopup(false);
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle grading
  const handleGrade = async (submissionId, score) => {
    try {
      await contentService.gradeSubmission(submissionId, score);
      
      // Update submissions list
      const updatedSubmissions = await contentService.getSubmissions(activity.id);
      setSubmissions(updatedSubmissions);
      
      Alert.alert('Success', 'Grade assigned successfully!');
      setGradingMode(false);
      setGrading({});
      
      // Immediately trigger refresh of grading system with current timestamp
      // This will be picked up by SubjectDetail's useEffect for refreshGrading
      router.setParams({ refreshGrading: Date.now().toString() });
    } catch (error) {
      console.error('Grading error:', error);
      Alert.alert('Error', 'Failed to assign grade. Please try again.');
    }
  };

  // Handle student editing their submission
  const startEditSubmission = () => {
    setEditSubmissionText(studentSubmissionData?.content || '');
    setEditSubmissionFile(null);
    setIsEditingSubmission(true);
  };

  const cancelEditSubmission = () => {
    setIsEditingSubmission(false);
    setEditSubmissionText('');
    setEditSubmissionFile(null);
  };

  const handleEditSubmissionPickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setEditSubmissionFile({
          uri: result.uri,
          name: result.name,
          type: result.mimeType || 'application/octet-stream',
        });
        return;
      }

      if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
        const asset = result.assets[0];
        setEditSubmissionFile({
          uri: asset.uri,
          name: asset.name || asset.fileName || asset.uri?.split('/')?.pop() || 'uploaded-file',
          type: asset.mimeType || asset.type || 'application/octet-stream',
        });
        return;
      }

      if (result.type === 'cancel') {
        setEditSubmissionFile(null);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleSaveEditedSubmission = async () => {
    const hasText = !!editSubmissionText.trim();
    const hasNewFile = !!editSubmissionFile;
    const hasExistingFile = !!studentFileUrl;

    if (!hasText && !hasNewFile && !hasExistingFile) {
      Alert.alert('Error', 'Please provide a response or upload a file.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedData = {
        content: editSubmissionText.trim() || null,
        file: editSubmissionFile || null,
      };

      // If we have an existing submission, update it instead of creating a new one
      if (studentSubmissionData && studentSubmissionData.id) {
        await contentService.updateSubmission(studentSubmissionData.id, updatedData);
      } else {
        await contentService.submitActivity(activity.id, updatedData);
      }
      
      // Update submission status
      const status = await contentService.getSubmissionStatus(activity.id);
      setSubmissionStatus(status);

      const latestSubmission = await contentService.getOwnSubmission(activity.id);
      setStudentSubmissionData(latestSubmission);
      if (latestSubmission?.file_url) {
        setFile({
          uri: latestSubmission.file_url,
          name: getFileNameFromUrl(latestSubmission.file_url) || 'Submitted Document',
          type: 'application/octet-stream',
        });
      }
      
      setIsEditingSubmission(false);
      setEditSubmissionText('');
      setEditSubmissionFile(null);
      
      Alert.alert('Success', 'Your submission has been updated!');
    } catch (error) {
      console.error('Edit submission error:', error);
      Alert.alert('Error', 'Failed to update submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle teacher editing student submission
  const startEditTeacherSubmission = (submission) => {
    setIsEditingTeacherSubmission(submission.id);
    setEditTeacherText(submission.content || '');
    setEditTeacherFile(null);
  };

  const cancelEditTeacherSubmission = () => {
    setIsEditingTeacherSubmission(null);
    setEditTeacherText('');
    setEditTeacherFile(null);
  };

  const handleEditTeacherPickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.type === 'success') {
        setEditTeacherFile(result);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleSaveEditedTeacherSubmission = async (submissionId) => {
    if (!editTeacherText.trim() && !editTeacherFile) {
      Alert.alert('Error', 'Please provide a response or upload a file.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedData = {
        content: editTeacherText.trim() || null,
        file: editTeacherFile || null
      };

      // If submissionId provided, update that submission; otherwise fall back to submitActivity
      if (submissionId) {
        await contentService.updateSubmission(submissionId, updatedData);
      } else {
        await contentService.submitActivity(activity.id, updatedData);
      }
      
      // Reload submissions
      const updatedSubmissions = await contentService.getSubmissions(activity.id);
      setSubmissions(updatedSubmissions);
      
      setIsEditingTeacherSubmission(null);
      setEditTeacherText('');
      setEditTeacherFile(null);
      
      Alert.alert('Success', 'Submission has been updated!');
    } catch (error) {
      console.error('Edit submission error:', error);
      Alert.alert('Error', 'Failed to update submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle teacher editing the activity
  const startEditActivity = () => {
    setEditActivityTitle(activity.title || '');
    setEditActivityDescription(activity.description || '');
    setEditActivityFile(null);
    setIsEditingActivity(true);
    setShowActivityEditMenu(false);
  };

  const cancelEditActivity = () => {
    setIsEditingActivity(false);
    setEditActivityTitle('');
    setEditActivityDescription('');
    setEditActivityFile(null);
  };

  const handleEditActivityPickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.type === 'success') {
        setEditActivityFile(result);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleSaveEditedActivity = async () => {
    if (!editActivityTitle.trim()) {
      Alert.alert('Error', 'Activity name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedActivity = {
        title: editActivityTitle.trim(),
        description: editActivityDescription.trim(),
        file: editActivityFile || null
      };

      // Update activity - you may need to add an updateActivity method to contentService
      // For now, we'll use a similar approach to submission
      console.log('Updating activity:', updatedActivity);
      
      // Update the local activity state
      setActivity({
        ...activity,
        title: updatedActivity.title,
        description: updatedActivity.description
      });
      
      setIsEditingActivity(false);
      setEditActivityTitle('');
      setEditActivityDescription('');
      setEditActivityFile(null);
      
      Alert.alert('Success', 'Activity has been updated!');
    } catch (error) {
      console.error('Edit activity error:', error);
      Alert.alert('Error', 'Failed to update activity. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Parse the activity data
  useEffect(() => {
    if (activityString) {
      try {
        const activityData = JSON.parse(activityString);
        setActivity(activityData);
        
        // Extract subject_id from activity object if available and not already set
        if (activityData.subject_id && !routeSubjectId) {
          console.log('Extracted subject_id from activity:', activityData.subject_id);
          setSubjectId(activityData.subject_id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error parsing activity data:', error);
        Alert.alert('Error', 'Failed to load activity details');
        setLoading(false);
      }
    }
  }, [activityString, routeSubjectId]);

  // Load submission status when activity is loaded
  useEffect(() => {
    if (activity) {
      loadSubmissionStatus();

      const params = activity?.previewFile && typeof activity.previewFile === 'string' ? activity.previewFile : null;
      if (isStudent && params === 'student' && studentFileUrl) {
        openFilePreviewModal(studentFileUrl);
      } else if (isTeacher && params === 'teacher') {
        const firstWithFile = submissions.find((sub) => getSubmissionFileUrl(sub));
        if (firstWithFile) {
          const fileUrl = getSubmissionFileUrl(firstWithFile);
          if (fileUrl) {
            openFullScreenFile(fileUrl, getFileNameFromUrl(fileUrl) || 'Submission');
          }
        }
      }
    }
  }, [activity, isStudent, isTeacher, studentFileUrl]);

  // Force re-render when student names change
  useEffect(() => {
    console.log('Student names state updated:', studentNames);
  }, [studentNames]);

  const getActivityType = () => {
    if (!activity) return '';
    
    if (activity.category === 'major exam') return 'Written Exam';
    if (activity.category === 'lab exam') return 'Laboratory Exam';
    if (activity.category === 'laboratory') return 'Laboratory Activity';
    if (activity.category === 'assignment') return 'Assignment';
    if (activity.category === 'project') return 'Project';
    if (activity.category === 'quiz') return 'Quiz';
    return 'Activity';
  };

  const getActivityIcon = () => {
    if (!activity) return 'help-circle';
    
    if (activity.category === 'major exam' || activity.category === 'lab exam') return 'school';
    if (activity.category === 'laboratory') return 'flask';
    if (activity.category === 'assignment') return 'create';
    if (activity.category === 'project') return 'folder';
    if (activity.category === 'quiz') return 'help-circle';
    return 'document-text';
  };

  const handleOpenFile = (fileUrl) => {
    try {
      console.log('Opening file with URL:', fileUrl);
      // Always show the file preview in the app's modal (no external opening)
      setFilePreviewUrl(fileUrl);
      setShowFilePreviewModal(true);
    } catch (error) {
      console.error('Error preparing file preview:', error);
      Alert.alert('Error', 'Could not open the file. Please try again.');
    }
  };

  const getActivityColor = () => {
    if (!activity) return '#28a745';
    
    if (activity.category === 'major exam' || activity.category === 'lab exam') return '#dc3545';
    if (activity.category === 'laboratory') return '#6f42c1';
    if (activity.category === 'assignment') return '#ffc107';
    if (activity.category === 'project') return '#20c997';
    if (activity.category === 'quiz') return '#17a2b8';
    
    // Default color if no category matches
    return '#6c757d';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#28a745" />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.container}>
        <Text>Activity not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subjectName || 'Activity Details'}</Text>
        {isTeacher && (
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="notifications" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { borderLeftColor: getActivityColor() }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: getActivityColor() + '20' }]}>
              <Ionicons 
                name={getActivityIcon()} 
                size={24} 
                color={getActivityColor()} 
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.activityType}>{getActivityType()}</Text>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              {activity.term && (
                <Text style={styles.termBadge}>
                  {activity.term.charAt(0).toUpperCase() + activity.term.slice(1)} Term
                </Text>
              )}
            </View>
            {isTeacher && (
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => setShowActivityEditMenu(true)}
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#6c757d" />
              </TouchableOpacity>
            )}
          </View>

          {activity.max_score && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Max Score:</Text>
              <Text style={styles.detailValue}>{activity.max_score} points</Text>
            </View>
          )}

          {activity.due_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(activity.due_date).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {activity.description || 'No description provided.'}
            </Text>
          </View>

          {activity.instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.instructionsText}>
                {activity.instructions}
              </Text>
            </View>
          )}

          {activity.file_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attached File</Text>
              <TouchableOpacity
                style={styles.fileButton}
                onPress={() => openFullScreenFile(activity.file_url, getFileNameFromUrl(activity.file_url) || 'Activity File')}
              >
                <Ionicons name="document-text" size={20} color="#28a745" />
                <Text style={styles.fileButtonText}>
                  {getFileNameFromUrl(activity.file_url) || 'Activity File'}
                </Text>
                <Ionicons name="open-outline" size={20} color="#28a745" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submission Section - Show to students for all activity types */}
        {isStudent && (
          <View style={styles.submissionContainer}>
            <Text style={styles.sectionTitle}>Your Submission</Text>
            
            {/* Show submission status if already submitted */}
            {submissionStatus && submissionStatus.submitted && (
              <>
                <View style={[styles.statusBadge, { backgroundColor: submissionStatus.graded ? '#28a745' : '#ffc107' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.statusText}>
                    {submissionStatus.graded ? `Graded: ${submissionStatus.score} points` : 'Submitted'}
                  </Text>
                </View>

                {studentSubmissionData && (
                  <View style={styles.submittedDetails}>
                    <Text style={styles.submittedDetailsLabel}>Submitted on</Text>
                    <Text style={styles.submittedDetailsValue}>
                      {formatDate(studentSubmissionData.created_at)}
                    </Text>

                    {studentSubmissionData.content && (
                      <View style={styles.submittedContentBox}>
                        <Text style={styles.submittedDetailsLabel}>Response</Text>
                        <Text style={styles.submittedContentText}>{studentSubmissionData.content}</Text>
                      </View>
                    )}

                    {studentFileUrl && (
                      <TouchableOpacity
                        style={styles.viewSubmissionButton}
                        onPress={() => {
                          if (studentFileUrl) {
                            openFullScreenFile(studentFileUrl, getFileNameFromUrl(studentFileUrl) || 'Your Submission');
                          } else {
                            Alert.alert('No File', 'This submission does not have a file to view.');
                          }
                        }}
                      >
                        <Ionicons name="document-text" size={18} color="#fff" />
                        <Text style={styles.viewSubmissionButtonText}>View Full Submission</Text>
                      </TouchableOpacity>
                    )}

                    {/* Edit Button for Students */}
                    <TouchableOpacity
                      style={[styles.submitButton, { marginTop: 16, backgroundColor: '#007bff' }]}
                      onPress={startEditSubmission}
                    >
                      <Ionicons name="create" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>Edit Submission</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
            
            {/* Show submission form if not submitted */}
            {!submissionStatus?.submitted && (
              <>
                <Text style={styles.inputLabel}>Your Answer / Response</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder="Type your response here..."
                    value={submission}
                    onChangeText={setSubmission}
                    placeholderTextColor="#999"
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Or Upload a File</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={pickDocument}
                >
                  <Ionicons name="cloud-upload" size={24} color="#28a745" />
                  <Text style={styles.uploadButtonText}>
                    {file ? file.name : 'Choose File'}
                  </Text>
                </TouchableOpacity>

                {file && (
                  <View style={styles.filePreview}>
                    <Ionicons name="document-text" size={20} color="#28a745" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity onPress={() => setFile(null)}>
                      <Ionicons name="close-circle" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{marginTop: 20}}>
                  <TouchableOpacity 
                    style={[
                      styles.submitButton,
                      (!submission.trim() && !file) && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={(!submission.trim() && !file) || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        Submit {getActivityType()}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Teacher's Grading Section */}
        {isTeacher && (
          <View style={styles.gradingContainer}>
            <Text style={styles.sectionTitle}>Student Submissions</Text>

            {submissions.length === 0 ? (
              <Text style={styles.noSubmissionsText}>No submissions yet</Text>
            ) : (
              submissions.map((sub) => {
                const studentName = studentNames[sub.student_id] || `Student ${sub.student_id.slice(-6)}`;
                console.log(`Rendering submission for student ${sub.student_id}:`, studentName);
                console.log('Current studentNames state:', studentNames);
                
                return (
                  <View key={sub.id} style={styles.submissionCard}>
                    <View style={styles.submissionHeader}>
                      <Text style={styles.studentName}>
                        {studentName}
                      </Text>
                      <Text style={styles.submissionDate}>
                        Submitted: {formatDate(sub.created_at)}
                      </Text>
                    </View>
                  
                  {sub.content && (
                    <View style={styles.submissionContent}>
                      <Text style={styles.contentLabel}>Response:</Text>
                      <Text style={styles.contentText}>{sub.content}</Text>
                    </View>
                  )}
                  
                  {getSubmissionFileUrl(sub) && (
                    <>
                      {isImageUrl(getSubmissionFileUrl(sub)) ? (
                        <TouchableOpacity 
                          onPress={() => {
                            openSubmissionModal(sub);
                          }}
                        >
                          <Image
                            source={{ uri: getSubmissionFileUrl(sub) }}
                            style={styles.teacherImagePreview}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.teacherWebViewContainer}>
                            <WebView
                              source={getWebViewSource(getSubmissionFileUrl(sub))}
                              style={styles.teacherWebView}
                              javaScriptEnabled={true}
                              domStorageEnabled={true}
                              allowFileAccess={false}
                              allowFileAccessFromFileURLs={false}
                              allowUniversalAccessFromFileURLs={false}
                              allowsLinkPreview={false}
                              allowsBackForwardNavigationGestures={false}
                              allowsFullscreenVideo={false}
                              allowsInlineMediaPlayback={true}
                              mediaPlaybackRequiresUserAction={true}
                              startInLoadingState={true}
                              renderToHardwareTextureAndroid={true}
                              thirdPartyCookiesEnabled={false}
                              setSupportMultipleWindows={false}
                              setBuiltInZoomControls={false}
                              setDisplayZoomControls={false}
                              setLoadWithOverviewMode={true}
                              setUseWideViewPort={true}
                              scrollEnabled={true}
                              overScrollMode="never"
                              onShouldStartLoadWithRequest={(request) => {
                                // Skip navigation to 'about:blank' or empty URL
                                if (!request.url || request.url === 'about:blank') return true;
                                
                                // Block download requests and force inline viewing
                                const shouldBlock = !blockDownloads(request);
                                if (shouldBlock) {
                                  return false;
                                }
                                
                                // Only allow navigation within the same domain
                                try {
                                  const currentUrl = new URL(filePreviewUrl || '');
                                  const newUrl = new URL(request.url);
                                  return currentUrl.hostname === newUrl.hostname;
                                } catch (e) {
                                  return true; // Allow if URL parsing fails
                                }
                              }}
                            renderLoading={() => (
                              <View style={styles.webViewLoader}>
                                <ActivityIndicator size="large" color="#28a745" />
                                <Text style={styles.loadingText}>Loading document...</Text>
                              </View>
                            )}
                            onError={(syntheticEvent) => {
                              const { nativeEvent } = syntheticEvent;
                              // Only show error if not a navigation error (which can be common with WebView)
                              if (!nativeEvent.description.includes('net::ERR_ABORTED')) {
                                console.warn('WebView error:', nativeEvent);
                              }
                            }}
                            onHttpError={(syntheticEvent) => {
                              const { nativeEvent } = syntheticEvent;
                              // Only log non-200 status codes
                              if (nativeEvent.statusCode >= 400) {
                                console.warn('WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
                              }
                            }}
                          />
                        </View>
                      )}
                    </>
                  )}
                  
                  <TouchableOpacity
                    style={styles.viewSubmissionButton}
                    onPress={() => {
                      console.log('=== BUTTON CLICK DEBUG ===');
                      console.log('Submission clicked:', sub);
                      console.log('Submission ID:', sub.id);
                      console.log('All submission keys:', Object.keys(sub));
                      
                      const fileUrl = getSubmissionFileUrl(sub);
                      console.log('Final file URL result:', fileUrl);
                      
                      if (fileUrl) {
                        console.log('Opening full-screen viewer with URL:', fileUrl);
                        openFullScreenFile(fileUrl, getFileNameFromUrl(fileUrl) || 'Submission');
                      } else {
                        console.log('No file URL found, showing alert');
                        Alert.alert('No File', 'This submission does not have a file to view.');
                      }
                      console.log('=== END BUTTON DEBUG ===');
                    }}
                  >
                    <Ionicons name="document-text" size={18} color="#fff" />
                    <Text style={styles.viewSubmissionButtonText}>View Full Submission</Text>
                  </TouchableOpacity>

                  <View style={styles.gradeSection}>
                    {sub.score > 0 ? (
                      <View style={styles.gradeDisplay}>
                        <Text style={styles.gradeLabel}>Grade:</Text>
                        <Text style={styles.gradeValue}>{sub.score} points</Text>
                      </View>
                    ) : (
                      <View style={styles.gradeInput}>
                        <TextInput
                          style={styles.gradeTextInput}
                          placeholder="Enter score"
                          value={grading[sub.id] || ''}
                          onChangeText={(text) => setGrading(prev => ({...prev, [sub.id]: text}))}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          style={styles.gradeButton}
                          onPress={() => handleGrade(sub.id, parseInt(grading[sub.id]) || 0)}
                        >
                          <Text style={styles.gradeButtonText}>Grade</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                );
              })
            )}
          </View>
        )}

        {/* Activity Edit Menu Modal */}
        <Modal
          visible={showActivityEditMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActivityEditMenu(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            onPress={() => setShowActivityEditMenu(false)}
          >
            <View style={styles.menuDropdown}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={startEditActivity}
              >
                <Ionicons name="create" size={20} color="#007bff" />
                <Text style={styles.menuItemText}>Edit Activity</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Activity Edit Modal */}
        <Modal
          visible={isEditingActivity}
          transparent
          animationType="slide"
          onRequestClose={cancelEditActivity}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit Activity</Text>
                <TouchableOpacity onPress={cancelEditActivity} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color="#6c757d" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Activity Name</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter activity name..."
                    value={editActivityTitle}
                    onChangeText={setEditActivityTitle}
                    placeholderTextColor="#999"
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Description</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={[styles.textInput, { height: 120 }]}
                    multiline
                    placeholder="Enter activity description..."
                    value={editActivityDescription}
                    onChangeText={setEditActivityDescription}
                    placeholderTextColor="#999"
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Activity File</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handleEditActivityPickFile}
                >
                  <Ionicons name="cloud-upload" size={24} color="#28a745" />
                  <Text style={styles.uploadButtonText}>
                    {editActivityFile ? editActivityFile.name : 'Choose File'}
                  </Text>
                </TouchableOpacity>

                {editActivityFile && (
                  <View style={styles.filePreview}>
                    <Ionicons name="document-text" size={20} color="#28a745" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {editActivityFile.name}
                    </Text>
                    <TouchableOpacity onPress={() => setEditActivityFile(null)}>
                      <Ionicons name="close-circle" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={[styles.submitButton, { height: 50, justifyContent: 'center', flex: 1, marginRight: 8 }]}
                  onPress={handleSaveEditedActivity}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#6c757d', height: 50, justifyContent: 'center', flex: 1, marginLeft: 8 }]}
                  onPress={cancelEditActivity}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Student Edit Submission Modal */}
        <Modal
          visible={isEditingSubmission}
          transparent
          animationType="slide"
          onRequestClose={cancelEditSubmission}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit Submission</Text>
                <TouchableOpacity onPress={cancelEditSubmission} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color="#6c757d" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Response</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder="Edit your response..."
                    value={editSubmissionText}
                    onChangeText={setEditSubmissionText}
                    placeholderTextColor="#999"
                  />
                </View>

                {studentFileUrl && !editSubmissionFile && (
                  <TouchableOpacity
                    style={[styles.submittedFileButton, { marginTop: 16, backgroundColor: '#f8f9fa' }]}
                    onPress={() => openFullScreenFile(studentFileUrl, getFileNameFromUrl(studentFileUrl) || 'Current File')}
                  >
                    <Ionicons name="document-text" size={20} color="#6c757d" />
                    <Text style={[styles.submittedFileButtonText, { color: '#6c757d' }]}>View Current File</Text>
                    <Ionicons name="open-outline" size={20} color="#6c757d" />
                  </TouchableOpacity>
                )}

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Or Upload a Different File</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handleEditSubmissionPickFile}
                >
                  <Ionicons name="cloud-upload" size={24} color="#28a745" />
                  <Text style={styles.uploadButtonText}>
                    {editSubmissionFile ? editSubmissionFile.name : 'Choose New File'}
                  </Text>
                </TouchableOpacity>

                {editSubmissionFile && (
                  <View style={styles.filePreview}>
                    <Ionicons name="document-text" size={20} color="#28a745" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {editSubmissionFile.name}
                    </Text>
                    <TouchableOpacity onPress={() => setEditSubmissionFile(null)}>
                      <Ionicons name="close-circle" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginRight: 8, height: 48, justifyContent: 'center' }]}
                  onPress={handleSaveEditedSubmission}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#6c757d', flex: 1, marginLeft: 8, height: 48, justifyContent: 'center' }]}
                  onPress={cancelEditSubmission}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Teacher Edit Submission Modal */}
        <Modal
          visible={isEditingTeacherSubmission !== null}
          transparent
          animationType="slide"
          onRequestClose={cancelEditTeacherSubmission}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit Student Submission</Text>
                <TouchableOpacity onPress={cancelEditTeacherSubmission} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color="#6c757d" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Response</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder="Edit student's response..."
                    value={editTeacherText}
                    onChangeText={setEditTeacherText}
                    placeholderTextColor="#999"
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Or Update the File</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handleEditTeacherPickFile}
                >
                  <Ionicons name="cloud-upload" size={24} color="#28a745" />
                  <Text style={styles.uploadButtonText}>
                    {editTeacherFile ? editTeacherFile.name : 'Choose New File'}
                  </Text>
                </TouchableOpacity>

                {editTeacherFile && (
                  <View style={styles.filePreview}>
                    <Ionicons name="document-text" size={20} color="#28a745" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {editTeacherFile.name}
                    </Text>
                    <TouchableOpacity onPress={() => setEditTeacherFile(null)}>
                      <Ionicons name="close-circle" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginRight: 8, height: 48, justifyContent: 'center' }]}
                  onPress={() => handleSaveEditedTeacherSubmission(isEditingTeacherSubmission)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#6c757d', flex: 1, marginLeft: 8, height: 48, justifyContent: 'center' }]}
                  onPress={cancelEditTeacherSubmission}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Teacher submission preview modal */}
        <Modal
          visible={showSubmissionModal && !!selectedSubmission}
          transparent
          animationType="fade"
          onRequestClose={closeSubmissionModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {modalLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#28a745" />
                  <Text style={styles.modalLoadingText}>Loading submission...</Text>
                </View>
              ) : selectedSubmission ? (
                <>
                  <View style={styles.modalHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>
                        {studentNames[selectedSubmission.student_id] || 'Student Submission'}
                      </Text>
                      <Text style={styles.modalTimestamp}>
                        Submitted: {formatDate(selectedSubmission.created_at)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={closeSubmissionModal} style={styles.modalCloseButton}>
                      <Ionicons name="close" size={22} color="#6c757d" />
                    </TouchableOpacity>
                  </View>

                  {selectedSubmission.content ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Response</Text>
                      <ScrollView style={styles.modalScroll}>
                        <Text style={styles.modalBodyText}>{selectedSubmission.content}</Text>
                      </ScrollView>
                    </View>
                  ) : (
                    <Text style={styles.modalPlaceholder}>No written response provided.</Text>
                  )}

                  {submissionPreviewUrl && (
                    <View style={styles.modalPreviewContainer}>
                      {isImageUrl(submissionPreviewUrl) ? (
                        <Image
                          source={{ uri: submissionPreviewUrl }}
                          style={styles.modalImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <WebView
                          source={getWebViewSource(submissionPreviewUrl)}
                          style={styles.modalWebView}
                          javaScriptEnabled={true}
                          domStorageEnabled={true}
                          allowFileAccess={false}
                          allowFileAccessFromFileURLs={false}
                          allowUniversalAccessFromFileURLs={false}
                          startInLoadingState={true}
                          renderLoading={() => (
                            <View style={styles.webViewLoader}>
                              <ActivityIndicator size="large" color="#28a745" />
                              <Text style={styles.loadingText}>Loading document...</Text>
                            </View>
                          )}
                          onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView error: ', nativeEvent);
                            Alert.alert('Error', 'Failed to load the document. Please try opening it externally.');
                          }}
                          onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView HTTP error: ', nativeEvent);
                          }}
                          onShouldStartLoadWithRequest={(request) => {
                            // Block any requests that look like file downloads
                            const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.exe', '.dmg', '.pkg'];
                            const isDownload = downloadExtensions.some(ext => request.url.toLowerCase().includes(ext));
                            
                            if (isDownload) {
                              Alert.alert(
                                'View Only',
                                'Files can only be viewed within the app for security reasons.',
                                [{ text: 'OK' }]
                              );
                              return false;
                            }
                            return true;
                          }}
                        />
                      )}

                      {!!submissionPreviewUrl && (
                        <View style={[styles.submittedFileButton, { marginTop: 16, backgroundColor: '#f8f9fa' }]}>
                          <Ionicons name="document-text" size={20} color="#6c757d" />
                          <Text style={[styles.submittedFileButtonText, { color: '#6c757d' }]}>
                            {getFileNameFromUrl(submissionPreviewUrl) || 'Document'}
                          </Text>
                          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.submitButton, { marginTop: 24 }]}
                    onPress={closeSubmissionModal}
                    accessibilityLabel="Close submission preview"
                  >
                    <Text style={styles.submitButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.modalPlaceholder}>No submission details available.</Text>
              )}
            </View>
          </View>
        </Modal>

        {/* Generic file preview modal */}
        <Modal
          visible={showFilePreviewModal && !!filePreviewUrl}
          transparent
          animationType="fade"
          onRequestClose={closeFilePreviewModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                </View>
                <TouchableOpacity onPress={closeFilePreviewModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color="#6c757d" />
                </TouchableOpacity>
              </View>

              {isImageUrl(filePreviewUrl) ? (
                <Image
                  source={{ uri: filePreviewUrl }}
                  style={styles.modalImagePreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ flex: 1 }}>
                  <WebView
                    source={getWebViewSource(filePreviewUrl)}
                    style={styles.modalWebView}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.webViewLoader}>
                        <ActivityIndicator size="large" color="#28a745" />
                        <Text style={styles.loadingText}>Loading document...</Text>
                      </View>
                    )}
                    onLoad={() => console.log('WebView loaded successfully for:', filePreviewUrl)}
                    onLoadStart={() => console.log('WebView starting to load:', filePreviewUrl)}
                    onError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error('WebView error:', nativeEvent, 'for URL:', filePreviewUrl);
                      if (!nativeEvent.description.includes('net::ERR_ABORTED')) {
                        // Show error with fallback option
                        Alert.alert(
                          'Error Loading Document', 
                          'Failed to load the document using the secure viewer. Would you like to try opening it directly?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Try Direct View', 
                              onPress: () => {
                                // Fallback: try direct URL without Google Docs viewer
                                console.log('Trying direct view for:', filePreviewUrl);
                                setFilePreviewUrl(filePreviewUrl + '#view=fit');
                              }
                            }
                          ]
                        );
                      }
                    }}
                    onHttpError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error('WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
                      Alert.alert(
                        'Error', 
                        `Failed to load the document (HTTP ${nativeEvent.statusCode}). The file may not be accessible.`,
                        [{ text: 'OK' }]
                      );
                    }}
                    onShouldStartLoadWithRequest={(request) => {
                      // Skip navigation to 'about:blank' or empty URL
                      if (!request.url || request.url === 'about:blank') return true;
                      
                      // Block download requests and force inline viewing
                      const shouldBlock = !blockDownloads(request);
                      return !shouldBlock;
                    }}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={true}
                    allowsFullscreenVideo={false}
                    allowsBackForwardNavigationGestures={false}
                    allowsLinkPreview={false}
                  />
                  
                  {/* Fallback info text */}
                  <View style={{ padding: 12, backgroundColor: '#f8f9fa', borderTopWidth: 1, borderTopColor: '#e9ecef' }}>
                    <Text style={{ fontSize: 12, color: '#6c757d', textAlign: 'center' }}>
                      If the document doesn't load, try closing and reopening this preview.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Full Screen File Modal - Similar to Lecture */}
        <Modal
          visible={showFullScreenFileModal}
          transparent={false}
          animationType="slide"
          onRequestClose={closeFullScreenFileModal}
        >
          <View style={styles.fullScreenFileModalContainer}>
            {/* Header */}
            <View style={styles.fullScreenFileModalHeader}>
              <TouchableOpacity 
                style={styles.fullScreenFileCloseButton}
                onPress={closeFullScreenFileModal}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.fullScreenFileModalTitle} numberOfLines={1}>
                {fullScreenFileTitle || 'Document'}
              </Text>
              <View style={{ width: 44 }} />
            </View>

            {/* File Viewer */}
            <View style={styles.fullScreenFileViewerContainer}>
              {fullScreenFileUrl ? (
                isImageUrl(fullScreenFileUrl) ? (
                  <Image
                    source={{ uri: fullScreenFileUrl }}
                    style={styles.fullScreenImageViewer}
                    resizeMode="contain"
                  />
                ) : (
                  <WebView
                    source={{
                      uri: `https://docs.google.com/gview?embedded=true&rm=minimal&url=${encodeURIComponent(fullScreenFileUrl)}`
                    }}
                    style={styles.fullScreenFileViewer}
                    onLoadStart={() => setPdfLoading(true)}
                    onLoadEnd={() => setPdfLoading(false)}
                    onError={(error) => {
                      console.error('File Error:', error);
                      setPdfLoading(false);
                      Alert.alert('Error', 'Failed to load file. Please try again.');
                    }}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.fullScreenFileLoadingContainer}>
                        <ActivityIndicator size="large" color="#28a745" />
                        <Text style={styles.fullScreenFileLoadingText}>Loading document...</Text>
                      </View>
                    )}
                    onShouldStartLoadWithRequest={(request) => {
                      // Block any requests that look like file downloads
                      const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.exe', '.dmg', '.pkg'];
                      const isDownload = downloadExtensions.some(ext => request.url.toLowerCase().includes(ext)) ||
                                       request.url.toLowerCase().includes('download') ||
                                       request.url.toLowerCase().includes('force-download');
                      
                      if (isDownload) {
                        Alert.alert(
                          'View Only',
                          'Files can only be viewed within the app for security reasons.',
                          [{ text: 'OK' }]
                        );
                        return false;
                      }
                      
                      // Only allow navigation within Google Docs domain
                      const isAllowed = request.url.startsWith('https://docs.google.com/') || 
                                       request.url.startsWith('https://drive.google.com/');
                      if (!isAllowed) {
                        console.log('Blocking external navigation to:', request.url);
                        return false;
                      }
                      
                      return true;
                    }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowFileAccess={false}
                    allowFileAccessFromFileURLs={false}
                    allowUniversalAccessFromFileURLs={false}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={true}
                    allowsFullscreenVideo={false}
                    allowsBackForwardNavigationGestures={false}
                    allowsLinkPreview={false}
                  />
                )
              ) : (
                <View style={styles.fullScreenFileErrorContainer}>
                  <Ionicons name="alert-circle" size={64} color="#dc3545" />
                  <Text style={styles.fullScreenFileErrorText}>File not available</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Submitted Popup */}
        {showSubmittedPopup && (
          <View style={styles.popupOverlay}>
            <View style={styles.submittedPopup}>
              <Ionicons name="checkmark-circle" size={60} color="#28a745" />
              <Text style={styles.popupTitle}>Submitted!</Text>
              <Text style={styles.popupMessage}>Your {getActivityType()} has been submitted successfully.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#28a745',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 30, // Add padding at the bottom for better scrolling
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  activityType: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  termBadge: {
    backgroundColor: '#e9ecef',
    color: '#495057',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#6c757d',
    fontSize: 14,
  },
  detailValue: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  descriptionText: {
    color: '#495057',
    lineHeight: 22,
  },
  instructionsText: {
    color: '#495057',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 8,
  },
  submittedWebViewContainer: {
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cde9d6',
    marginBottom: 12,
  },
  submittedWebView: {
    flex: 1,
  },
  fileButtonText: {
    flex: 1,
    marginLeft: 8,
    color: '#2c3e50',
  },
  submissionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  inputLabel: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInputContainer: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    minHeight: 120,
  },
  textInput: {
    padding: 12,
    textAlignVertical: 'top',
    color: '#2c3e50',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#28a745',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  uploadButtonText: {
    color: '#28a745',
    marginLeft: 8,
    fontWeight: '500',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    alignSelf: 'center',
  },
  // Submission status styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submittedDetails: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f8f5',
    borderWidth: 1,
    borderColor: '#cde9d6',
  },
  submittedDetailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#218838',
    marginBottom: 4,
  },
  submittedDetailsValue: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 12,
  },
  submittedImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  submittedContentBox: {
    marginBottom: 12,
  },
  submittedContentText: {
    fontSize: 15,
    color: '#343a40',
    lineHeight: 20,
  },
  submittedFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#28a745',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  submittedFileButtonText: {
    color: '#28a745',
    fontWeight: '600',
    fontSize: 15,
  },
  viewSubmissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17a2b8',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  viewSubmissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Teacher grading styles
  gradingContainer: {
    marginTop: 20,
  },
  noSubmissionsText: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 20,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  submissionDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  submissionContent: {
    marginBottom: 12,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  submissionFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  teacherImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  gradeSection: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  gradeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginRight: 8,
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  gradeInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
  gradeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    zIndex: 1001,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTimestamp: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 16,
  },
  modalCloseButton: {
    padding: 4,
    marginLeft: 12,
  },
  modalSection: {
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalScroll: {
    maxHeight: 160,
  },
  modalBodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#343a40',
  },
  modalPlaceholder: {
    fontSize: 14,
    color: '#6c757d',
  },
  modalImagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  // Popup styles
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  submittedPopup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 40,
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 16,
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  webViewLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6c757d',
    fontSize: 14,
  },
  modalWebView: {
    flex: 1,
    minHeight: 400,
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: '#f8f9fa',
  },
  modalPreviewContainer: {
    marginTop: 16,
    flex: 1,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Full Screen File Modal Styles (similar to Lecture)
  fullScreenFileModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 0,
  },
  fullScreenFileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  fullScreenFileCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenFileModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  fullScreenFileViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenFileViewer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullScreenImageViewer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  fullScreenFileLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fullScreenFileLoadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  fullScreenFileErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fullScreenFileErrorText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
    marginRight: 0,
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuItemText: {
    fontSize: 16,
    color: '#007bff',
    marginLeft: 12,
    fontWeight: '600',
  },
  // Offline Grading Styles
  offlineGradingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineGradingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  offlineGradingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  studentSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  studentSelectItemActive: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007bff',
    borderWidth: 2,
  },
  studentSelectContent: {
    flex: 1,
  },
  studentSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  studentSelectEmail: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  studentSelectStatus: {
    fontSize: 12,
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  statusSubmitted: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusGraded: {
    backgroundColor: '#cfe2ff',
    color: '#084298',
  },
  studentSelectGrade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginLeft: 8,
  },
  gradeInputSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  maxScoreText: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 4,
    marginBottom: 12,
  },
  gradeInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  gradeButtonDisabled: {
    opacity: 0.6,
  },
});
