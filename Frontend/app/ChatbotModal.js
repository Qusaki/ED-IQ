import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatbotService } from './chatbotService';
import { useRBAC } from './RBACComponents';

const robotLogo = require('../assets/img/ED-IQ_LOGO.png');

// Strip markdown formatting for clean display
const cleanMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')          // **bold** -> bold
    .replace(/\*(.+?)\*/g, '$1')              // *italic* -> italic
    .replace(/^#{1,6}\s+/gm, '')              // ## Heading -> Heading
    .replace(/^[\*\-]\s+/gm, '\u2022 ')       // * item or - item -> bullet
    .replace(/\s*\(\d+(\.\d+)*\)/g, '')       // (2.1), (1.3.2) etc -> removed
    .replace(/\s+\n/g, '\n')                  // trailing spaces
    .trim();
};

const TypingIndicator = ({ isTeacher }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let isMounted = true;
    const animate = () => {
      Animated.sequence([
        Animated.stagger(150, [
          Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.stagger(150, [
          Animated.timing(dot1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      ]).start(({ finished }) => {
        if (finished && isMounted) animate();
      });
    };
    animate();
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={[styles.messageWrapper, styles.botMessageWrapper, { marginBottom: 12 }]}>
      <Image source={robotLogo} style={styles.botAvatar} resizeMode="contain" />
      <View style={[styles.messageBubble, styles.botMessage, { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }]}>
        <Animated.View style={[styles.dot, isTeacher && { backgroundColor: '#E6B041' }, { opacity: dot1, transform: [{ translateY: dot1.interpolate({ inputRange: [0.3, 1], outputRange: [0, -3] }) }] }]} />
        <Animated.View style={[styles.dot, isTeacher && { backgroundColor: '#E6B041' }, { opacity: dot2, transform: [{ translateY: dot2.interpolate({ inputRange: [0.3, 1], outputRange: [0, -3] }) }] }]} />
        <Animated.View style={[styles.dot, isTeacher && { backgroundColor: '#E6B041' }, { opacity: dot3, transform: [{ translateY: dot3.interpolate({ inputRange: [0.3, 1], outputRange: [0, -3] }) }] }]} />
      </View>
    </View>
  );
};


export default function ChatbotModal({ visible, onClose }) {
  const { isTeacher } = useRBAC();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your ED-IQ Assistant. I'm here to help answer questions about school policies, rules, and procedures. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputText('');
    setLoading(true);

    // Get bot response
    const result = await chatbotService.sendMessage(inputText);

    setLoading(false);

    if (result.success) {
      const botMessage = {
        id: messages.length + 2,
        text: result.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } else {
      const errorMessage = {
        id: messages.length + 2,
        text: `Sorry, I encountered an error: ${result.error}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, isTeacher && { backgroundColor: '#003366' }]}>
          <Text style={[styles.headerTitle, isTeacher && { color: '#E6B041' }]}>ED-IQ Assistant</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={isTeacher ? "#E6B041" : "#003366"} />
          </TouchableOpacity>
        </View>

        {/* Messages Container */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.sender === 'user'
                  ? styles.userMessageWrapper
                  : styles.botMessageWrapper,
              ]}
            >
              {message.sender === 'bot' && (
                <Image source={robotLogo} style={styles.botAvatar} resizeMode="contain" />
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.sender === 'user'
                    ? styles.userMessage
                    : styles.botMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.sender === 'user'
                      ? styles.userMessageText
                      : styles.botMessageText,
                  ]}
                >
                  {message.sender === 'bot' ? cleanMarkdown(message.text) : message.text}
                </Text>
              </View>
            </View>
          ))}
          {loading && <TypingIndicator isTeacher={isTeacher} />}
        </ScrollView>

        {/* Input Area - wrapped in KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.inputContainer, { paddingBottom: Math.max(12, insets.bottom) }]}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything about school policies..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxHeight={100}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                isTeacher && { backgroundColor: '#003366' },
                (loading || !inputText.trim()) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={loading || !inputText.trim()}
            >
              <MaterialCommunityIcons name="send" size={20} color={isTeacher ? "#E6B041" : "#003366"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#E6B041',
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#003366',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageWrapper: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: '#E6B041',
  },
  botMessage: {
    backgroundColor: '#e9ecef',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#003366',
  },
  botMessageText: {
    color: '#003366',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    color: '#003366',
  },
  sendButton: {
    backgroundColor: '#E6B041',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#003366',
    marginHorizontal: 3,
  },
});