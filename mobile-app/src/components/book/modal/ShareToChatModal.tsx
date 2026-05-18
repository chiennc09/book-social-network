import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { chatApi } from '../../../api/chatApi';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../../constants/theme';
import { resolveMediaUrl } from '../../../config/env';

interface BookAttachmentData {
  bookId: string;
  title: string;
  author?: string;
  coverUrl?: string;
  ratingAverage?: number;
}

interface ShareToChatModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  bookAttachment: BookAttachmentData;
}

const ShareToChatModal = ({
  visible,
  onClose,
  navigation,
  bookAttachment,
}: ShareToChatModalProps) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      chatApi
        .myConversations()
        .then((res: any) => {
          const items = res.result || res.data?.result || [];
          setConversations(
            items.sort(
              (a: any, b: any) =>
                new Date(b.modifiedDate).getTime() -
                new Date(a.modifiedDate).getTime(),
            ),
          );
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleSelect = async (conv: any) => {
    setSendingId(conv.id);
    try {
      await chatApi.sendMessage({
        conversationId: conv.id,
        message: '',
        bookAttachment,
      });
    } catch (e) {
      console.error('Share failed', e);
    } finally {
      setSendingId(null);
    }
    onClose();
    navigation.push('ChatRoom', {
      conversationId: conv.id,
      conversationName: conv.conversationName,
      conversationAvatar: conv.conversationAvatar,
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSending = sendingId === item.id;
    return (
      <TouchableOpacity
        style={[styles.convRow, isSending && { opacity: 0.6 }]}
        onPress={() => handleSelect(item)}
        disabled={isSending}>
        <Image
          source={{ uri: resolveMediaUrl(item.conversationAvatar, 'avatars') || DEFAULT_AVATAR }}
          style={styles.avatar}
        />
        <View style={styles.convInfo}>
          <Text style={styles.convName} numberOfLines={1}>
            {item.conversationName || 'Cuộc trò chuyện'}
          </Text>
          {item.lastMessage ? (
            <Text style={styles.convPreview} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          ) : null}
        </View>
        {isSending ? (
          <ActivityIndicator size="small" color={COLORS.textSecondary} />
        ) : (
          <Icon name="chevron-right" size={18} color={COLORS.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          {/* Book preview card */}
          <View style={styles.bookPreview}>
            {bookAttachment.coverUrl ? (
              <Image
                source={{ uri: bookAttachment.coverUrl }}
                style={styles.bookCover}
              />
            ) : (
              <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
                <Icon name="book" size={24} color={COLORS.textSecondary} />
              </View>
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookLabel}>Chia sẻ sách</Text>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {bookAttachment.title}
              </Text>
              {bookAttachment.author ? (
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {bookAttachment.author}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="x" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Gửi đến…</Text>

          {loading ? (
            <ActivityIndicator color={COLORS.text} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={i => i.id}
              renderItem={renderItem}
              ListEmptyComponent={
                <Text style={styles.empty}>Chưa có cuộc trò chuyện nào</Text>
              }
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 20,
  },
  bookPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bookCover: { width: 48, height: 64, borderRadius: 6, marginRight: SPACING.m },
  bookCoverPlaceholder: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: { flex: 1 },
  bookLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 },
  bookTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  bookAuthor: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 6 },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingHorizontal: SPACING.m,
    paddingVertical: 10,
    fontWeight: '600',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: SPACING.m },
  convInfo: { flex: 1 },
  convName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  convPreview: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 24 },
});

export default ShareToChatModal;
