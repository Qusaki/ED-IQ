import { StyleSheet, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

export const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  authContainer: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#495057',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  brandText: {
    fontSize: isSmallDevice ? 26 : 32,
    fontWeight: 'bold',
    color: '#2ecc71',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: isSmallDevice ? 20 : 30,
    marginHorizontal: isSmallDevice ? 15 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: isSmallDevice ? 22 : 28,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 20 : 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: isSmallDevice ? 50 : 56,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 15 : 20,
    fontSize: isSmallDevice ? 14 : 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: isSmallDevice ? 50 : 56,
    marginBottom: isSmallDevice ? 15 : 20,
    backgroundColor: '#f8f9fa',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: isSmallDevice ? 12 : 16,
    fontSize: isSmallDevice ? 14 : 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashlightContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  flashlightIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  flashlightIconOn: {
    opacity: 1,
  },
  lightBeam: {
    position: 'absolute',
    top: -5,
    alignItems: 'center',
  },
  lightRays: {
    fontSize: 12,
    color: '#ffd700',
  },
  flashlightText: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  flashlightTextOn: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  flashlightOn: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: isSmallDevice ? 50 : 56,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 15 : 20,
    backgroundColor: '#f8f9fa',
  },
  roleSelectorText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#495057',
  },
  placeholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6c757d',
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 14,
  },
  authButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    color: '#6c757d',
  },
  switchLink: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
  },
  roleItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  roleItemText: {
    fontSize: 18,
    color: '#495057',
  },
  // Home Screen Styles
  homeContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  homeContent: {
    flexGrow: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  userRole: {
    fontSize: 14,
    color: '#003366',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 30,
    textTransform: 'capitalize',
  },
  roleSection: {
    marginBottom: 25,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  roleSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 15,
    textAlign: 'center',
  },
  roleButton: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  adminButton: {
    backgroundColor: '#dc3545',
  },
  teacherButton: {
    backgroundColor: '#003366',
  },
  studentButton: {
    backgroundColor: '#E6B041',
  },
  sharedButton: {
    backgroundColor: '#6c757d',
  },
  roleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#003366',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Missing styles
  disabledButton: {
    opacity: 0.6,
  },
  // Flashlight styles
  flashlightOn: {
    backgroundColor: '#ffd700',
  },
  flashlightIcon: {
    fontSize: 20,
  },
  flashlightIconOn: {
    color: '#ff8c00',
  },
  lightBeam: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRays: {
    fontSize: 16,
    color: '#ffd700',
  },
  flashlightText: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  flashlightTextOn: {
    color: '#ff8c00',
    fontWeight: 'bold',
  },
  topNav: {
    paddingHorizontal: 10,
    height: 50,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    zIndex: 10,
    padding: 15,
  },
});

export default styles;