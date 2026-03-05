import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { chatApi } from '../../api/chatApi';
import { chatSocketService } from '../../services/chatSocket.service';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';

const ChatRoomScreen = ({ route, navigation }: any) => {
  const { conversationId, conversationName } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    
    // Connect WebSocket
    chatSocketService.connect(() => {
       chatSocketService.subscribeToConversation(conversationId, (newMsg: any) => {
          setMessages(prev => [newMsg, ...prev]);
       });
    });

    return () => chatSocketService.unsubscribe();
  }, []);

  const fetchMessages = async () => {
    try {
      const response: any = await chatApi.getMessages(conversationId);
      const items = response.result || response.data?.result || [];
      // Assuming REST brings ordered by createdDate desc
      setMessages(items);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    chatApi.sendMessage({
       conversationId,
       message: inputText
    }).catch(console.error);

    setInputText('');
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.me;
    return (
      <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
        {!isMe && (
           <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: item.sender.userId })}>
             <Image source={{ uri: item.sender.avatar || DEFAULT_AVATAR }} style={styles.senderAvatar} />
           </TouchableOpacity>
        )}
        <View style={[styles.messageContent, isMe ? styles.messageContentMe : styles.messageContentThem]}>
           {!isMe && <Text style={styles.senderName}>{item.sender.displayName || item.sender.username}</Text>}
           <Text style={styles.messageText}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{conversationName || 'Chat'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: SPACING.m }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Icon name="send" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  chatContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  messageBubble: { flexDirection: 'row', marginVertical: 4, maxWidth: '80%' },
  messageBubbleMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageBubbleThem: { alignSelf: 'flex-start' },
  senderAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8, marginTop: 4 },
  messageContent: { padding: 12, borderRadius: 16 },
  messageContentMe: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  messageContentThem: { backgroundColor: '#333', borderBottomLeftRadius: 4 },
  senderName: { color: '#ccc', fontSize: 12, marginBottom: 2, fontWeight: 'bold' },
  messageText: { color: '#fff', fontSize: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: '#222', color: COLORS.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  sendButton: { backgroundColor: COLORS.text, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});

export default ChatRoomScreen;
