import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/Feather';
import { chatApi } from '../../api/chatApi';
import { chatSocketService } from '../../services/chatSocket.service';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import { resolveMediaUrl } from '../../config/env';
import { UserAvatar } from '../../components/common/UserAvatar';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatTime = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Book Card Sub-component ─────────────────────────────────────────────────

const BookCard = ({
  book,
  onPress,
  isMe,
}: {
  book: any;
  onPress: () => void;
  isMe: boolean;
}) => {
  const { colors, isDarkMode } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.bookCard,
        isMe ? styles.bookCardMe : [styles.bookCardThem, { backgroundColor: colors.card }],
      ]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={styles.bookCardInner}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.bookCardCover} />
        ) : (
          <View style={[
            styles.bookCardCover, 
            styles.bookCardCoverPlaceholder, 
            { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : (isDarkMode ? '#222' : '#F0F0F0') }
          ]}>
            <Icon name="book" size={22} color={isMe ? '#fff' : colors.textSecondary} />
          </View>
        )}
        <View style={styles.bookCardInfo}>
          <Text style={[styles.bookCardTitle, { color: isMe ? '#fff' : colors.text }]} numberOfLines={2}>
            {book.title}
          </Text>
          {book.author ? (
            <Text style={[styles.bookCardAuthor, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]} numberOfLines={1}>
              {book.author}
            </Text>
          ) : null}
          {typeof book.ratingAverage === 'number' ? (
            <View style={styles.bookCardRating}>
              <Icon name="star" size={12} color="#FFD700" />
              <Text style={styles.bookCardRatingText}>
                {book.ratingAverage.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
        <Icon name="chevron-right" size={18} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const ChatRoomScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { conversationId, conversationName, conversationAvatar } = route.params;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();

    chatSocketService.connect(() => {
      chatSocketService.subscribeToConversation(conversationId, (newMsg: any) => {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [newMsg, ...prev];
        });
      });
    });

    return () => chatSocketService.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMessages = async () => {
    try {
      const response: any = await chatApi.getMessages(conversationId);
      const items = response.result || response.data?.result || [];
      setMessages(items);
    } catch (e) {
      console.error(e);
    }
  };

  // Send a plain text message with optimistic UI
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      message: text,
      me: true,
      createdDate: new Date().toISOString(),
      sender: { displayName: '', username: '', avatar: null, userId: '' },
    };
    setMessages(prev => [optimisticMsg, ...prev]);
    setInputText('');

    chatApi.sendMessage({ conversationId, message: text }).catch(err => {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    });
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.me;
    const hasBook = !!item.bookAttachment;

    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
        ]}>
        {!isMe && (
          <TouchableOpacity
            onPress={() =>
              navigation.push('UserProfile', { userId: item.sender?.userId })
            }>
            <UserAvatar
              url={item.sender?.avatar}
              size={30}
              style={styles.senderAvatar}
            />
          </TouchableOpacity>
        )}
        <View style={styles.messageOuter}>
          {!isMe && (
            <Text style={[styles.senderName, { color: colors.textSecondary }]}>
              {item.sender?.displayName || item.sender?.username}
            </Text>
          )}

          {hasBook ? (
            <BookCard
              book={item.bookAttachment}
              isMe={isMe}
              onPress={() =>
                navigation.push('BookDetail', {
                  bookId: item.bookAttachment.bookId,
                })
              }
            />
          ) : (
            <View
              style={[
                styles.messageContent,
                isMe ? styles.messageContentMe : [styles.messageContentThem, { backgroundColor: colors.card }],
              ]}>
              <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>{item.message}</Text>
            </View>
          )}

          <Text
            style={[
              styles.timestamp,
              { color: colors.textSecondary },
            ]}>
            {formatTime(item.createdDate)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <UserAvatar
            url={conversationAvatar}
            size={36}
            style={styles.headerAvatar}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{conversationName || 'Chat'}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{
            paddingHorizontal: SPACING.m,
            paddingBottom: SPACING.m,
          }}
        />

        <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={sendMessage}>
            <Icon name="send" size={20} color={isDarkMode ? 'black' : 'white'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  chatContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },

  messageBubble: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '85%',
  },
  messageBubbleMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageBubbleThem: { alignSelf: 'flex-start' },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    marginTop: 4,
  },
  messageOuter: { flexShrink: 1 },
  senderName: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  messageContent: { padding: 12, borderRadius: 16 },
  messageContentMe: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  messageContentThem: {
    backgroundColor: '#333',
    borderBottomLeftRadius: 4,
  },
  messageText: { color: '#fff', fontSize: 15 },
  timestamp: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  timestampMe: { color: 'rgba(255,255,255,0.6)' },
  timestampThem: { color: '#777' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: COLORS.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: COLORS.text,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Book Card ──
  bookCard: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 220,
  },
  bookCardMe: { backgroundColor: '#005ECB' },
  bookCardThem: { backgroundColor: '#2A2A2A' },
  bookCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  bookCardCover: {
    width: 48,
    height: 64,
    borderRadius: 6,
    marginRight: 10,
  },
  bookCardCoverPlaceholder: {
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCardInfo: { flex: 1 },
  bookCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  bookCardAuthor: { color: '#ccc', fontSize: 12 },
  bookCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bookCardRatingText: { color: '#FFD700', fontSize: 12, marginLeft: 3 },
});

export default ChatRoomScreen;
