// src/screens/post/NewThreadScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import { postApi } from '../../api/postApi';
import { bookApi } from '../../api/bookApi';
import Icon from 'react-native-vector-icons/Feather';
import { Book } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { resolveMediaUrl } from '../../config/env';
import { profileApi } from '../../api/profileApi';
import { useTheme } from '../../context/ThemeContext';

const NewThreadScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { postToEdit } = route?.params || {};
  const [content, setContent]         = useState(postToEdit ? postToEdit.content : '');
  const [loading, setLoading]         = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(postToEdit ? postToEdit.book : null);
  const [searching, setSearching]     = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const [profileAvatar, setProfileAvatar] = useState<string>(DEFAULT_AVATAR);
  const [displayName, setDisplayName]     = useState<string>(user?.username || '');
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    const reduxAvatar = (user as any)?.avatar;
    if (reduxAvatar) {
      setProfileAvatar(reduxAvatar);
    }

    profileApi.getMyProfile()
      .then((res: any) => {
        const data = res?.result ?? res?.data?.result ?? res?.data ?? res;
        if (data?.avatar) setProfileAvatar(resolveMediaUrl(data.avatar, 'avatars'));
        if (data?.displayName || data?.username) {
          setDisplayName(data.displayName || data.username);
        }
      })
      .catch(() => {/* silently ignore, already have fallback */});
  }, []);

  // ── Post ────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      if (postToEdit) {
        await postApi.updatePost(postToEdit.id, {
          content,
          bookId: selectedBook?.id || undefined,
        });
        eventEmitter.emit(EventNames.POST_UPDATED, {
          id: postToEdit.id,
          content,
          book: selectedBook,
        });
      } else {
        const resp = await postApi.createPost({
          content,
          bookId: selectedBook?.id,
        });
        eventEmitter.emit(EventNames.POST_CREATED, (resp as any)?.data ?? resp);
      }
      navigation.goBack();
    } catch (error) {
      console.error('post error:', error);
      setLoading(false);
    }
  };

  // ── Book search (debounced) ─────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchBook = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (text.length < 2) {
      setBookResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res: any = await bookApi.search(text);
        const dataList: any[] = res?.data?.result ?? res?.result ?? res?.data ?? [];
        setBookResults(
          dataList.map((item: any) => ({
            id:            item.id,
            title:         item.title,
            authors:       item.authors,
            author:        item.authors?.[0] ?? 'Unknown',
            coverUrl:      resolveMediaUrl(item.coverImage ?? item.coverUrl, 'covers'),
            averageRating: item.averageRating ?? 0,
          })),
        );
      } catch (_) {}
      setSearching(false);
    }, 350);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Icon name="x" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{postToEdit ? 'Chỉnh sửa' : 'Bài viết mới'}</Text>
          <TouchableOpacity
            style={[styles.headerPostBtn, { backgroundColor: colors.primary }, (!content.trim() || loading) && { opacity: 0.45 }]}
            onPress={handlePost}
            disabled={!content.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={isDarkMode ? 'black' : 'white'} size="small" />
            ) : (
              <Text style={[styles.headerPostBtnText, { color: isDarkMode ? 'black' : 'white' }]}>
                {postToEdit ? 'Lưu' : 'Đăng'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.row}>
            {/* Avatar */}
            <Image
              source={{ uri: profileAvatar }}
              style={[styles.avatar, { borderColor: colors.border }]}
              defaultSource={{ uri: DEFAULT_AVATAR }}
            />

            <View style={styles.inputContainer}>
              <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>

              <TextInput
                placeholder="Hôm nay bạn đang đọc gì? Chia sẻ suy nghĩ của bạn..."
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text }]}
                multiline
                autoFocus
                value={content}
                onChangeText={setContent}
              />

              {/* Book preview / trigger chip */}
              {selectedBook ? (
                <View style={[styles.bookChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image
                    source={{ uri: selectedBook.coverUrl ?? selectedBook.coverImage }}
                    style={styles.chipCover}
                  />
                  <View style={styles.chipInfo}>
                    <Text style={[styles.chipTitle, { color: colors.text }]} numberOfLines={1}>
                      {selectedBook.title}
                    </Text>
                    <Text style={[styles.chipAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedBook.author ?? selectedBook.authors?.[0] ?? 'Unknown'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedBook(null)} style={styles.chipRemove}>
                    <Icon name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBookPlaceholder, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                  onPress={() => setShowBookModal(true)}
                >
                  <Icon name="book" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.addBookPlaceholderText, { color: colors.textSecondary }]}>
                    Đính kèm sách bạn đang đọc...
                  </Text>
                  <Icon name="plus" size={14} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}

              {/* Toolbar */}
              <View style={styles.toolbar}>
                <TouchableOpacity style={[styles.toolButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Icon name="image" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Icon name="camera" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Icon name="mic" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBookBadge, { backgroundColor: selectedBook ? (isDarkMode ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0, 131, 143, 0.12)') : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') }]}
                  onPress={() => setShowBookModal(true)}
                >
                  <Icon name="book" size={14} color={selectedBook ? (isDarkMode ? '#00E5FF' : '#00838F') : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.toolBookBadgeText, { color: selectedBook ? (isDarkMode ? '#00E5FF' : '#00838F') : colors.textSecondary }]}>
                    {selectedBook ? 'Đã đính kèm' : 'Đính kèm sách'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Book Search Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showBookModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowBookModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            {/* Modal header */}
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Đính kèm Sách</Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setShowBookModal(false)}
              >
                <Icon name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={[styles.modalSearchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="search" size={16} color={colors.textSecondary} style={{ marginLeft: 10 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Tìm tên sách..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearchBook}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setBookResults([]); }}>
                  <Icon name="x-circle" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                </TouchableOpacity>
              )}
            </View>

            {/* Results */}
            {searching ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={bookResults}
                keyExtractor={item => item.id}
                style={{ marginTop: 8 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  searchQuery.length > 1
                    ? <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không tìm thấy sách nào.</Text>
                    : <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nhập ít nhất 2 ký tự để tìm sách.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedBook(item);
                      setSearchQuery('');
                      setBookResults([]);
                      setShowBookModal(false);
                    }}
                  >
                    <Image
                      source={{ uri: item.coverUrl ?? item.coverImage }}
                      style={[styles.resultCover, { backgroundColor: colors.border }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.resultAuthor, { color: colors.textSecondary }]}>
                        {item.author ?? (item.authors?.[0] ?? 'Unknown')}
                      </Text>
                      {(item.averageRating ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                          <Icon name="star" size={12} color={isDarkMode ? '#FFD700' : '#D97706'} />
                          <Text style={[styles.resultRating, { color: colors.textSecondary }]}>
                            {item.averageRating!.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333',
  },
  closeButton: { padding: 4 },
  headerTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 17 },
  headerPostBtn: {
    paddingHorizontal: 18, paddingVertical: 6,
    borderRadius: 18, minWidth: 64, alignItems: 'center', justifyContent: 'center'
  },
  headerPostBtnText: { fontWeight: '700', fontSize: 14 },

  body: { flex: 1, padding: SPACING.m },
  row:  { flexDirection: 'row' },

  avatar: {
    width: 44, height: 44, borderRadius: 22,
    marginRight: 12, borderWidth: 1,
  },
  inputContainer: { flex: 1 },
  displayName: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  input:    { color: COLORS.text, fontSize: 16, minHeight: 120, textAlignVertical: 'top', lineHeight: 22 },

  // Add Book Placeholder
  addBookPlaceholder: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12, marginTop: 12,
    borderWidth: 1, borderStyle: 'dashed',
  },
  addBookPlaceholderText: { fontSize: 13, fontWeight: '500' },

  // Book chip
  bookChip: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 12,
    marginTop: 12, borderWidth: 1,
  },
  chipCover:  { width: 36, height: 54, borderRadius: 6, marginRight: 12 },
  chipInfo:   { flex: 1 },
  chipTitle:  { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  chipAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  chipRemove: { padding: 8 },

  // Toolbar
  toolbar:  { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 10 },
  toolButton: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center'
  },
  toolBookBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, height: 36, borderRadius: 18,
    marginLeft: 'auto'
  },
  toolBookBadgeText: { fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingBottom: 30,
    maxHeight: '82%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#444', alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },

  modalSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E1E1E', borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#333',
  },
  modalSearchInput: {
    flex: 1, color: COLORS.text, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15,
  },

  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 30, fontSize: 14 },

  resultItem: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a2a',
    alignItems: 'center',
  },
  resultCover:  { width: 44, height: 64, marginRight: 12, borderRadius: 5, backgroundColor: '#333' },
  resultTitle:  { color: COLORS.text, fontSize: 14, fontWeight: 'bold' },
  resultAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  resultRating: { color: COLORS.textSecondary, fontSize: 12, marginLeft: 4 },
});

export default NewThreadScreen;

