import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, ActivityIndicator, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
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

const NewThreadScreen = ({ navigation, route }: any) => {
  const { postToEdit } = route?.params || {};
  const [content, setContent]         = useState(postToEdit ? postToEdit.content : '');
  const [loading, setLoading]         = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(postToEdit ? postToEdit.book : null);
  const [searching, setSearching]     = useState(false);

  // ── Avatar ──────────────────────────────────────────────────────────────────
  // Redux user only has {id, username, scope} — no avatar field.
  // We fetch the full profile once on mount to get the real avatar URL.
  const { user } = useSelector((state: RootState) => state.auth);
  const [profileAvatar, setProfileAvatar] = useState<string>(DEFAULT_AVATAR);
  const [displayName, setDisplayName]     = useState<string>(user?.username || '');

  useEffect(() => {
    // Check if Redux user already has avatar patched in (from updateUserAvatar action)
    const reduxAvatar = (user as any)?.avatar;
    if (reduxAvatar) {
      setProfileAvatar(reduxAvatar);
    }

    // Always fetch fresh profile (avatar may have changed)
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
        // Emit the raw API response body (ApiResponse<Post>) so HomeScreen extracts .result
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{postToEdit ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.row}>
            {/* Avatar */}
            <Image
              source={{ uri: profileAvatar }}
              style={styles.avatar}
              defaultSource={{ uri: DEFAULT_AVATAR }}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.username}>{displayName}</Text>

              <TextInput
                placeholder="Có gì mới?"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                multiline
                autoFocus
                value={content}
                onChangeText={setContent}
              />

              {/* Book preview chip */}
              {selectedBook && (
                <View style={styles.bookChip}>
                  <Image
                    source={{ uri: selectedBook.coverUrl ?? selectedBook.coverImage }}
                    style={styles.chipCover}
                  />
                  <View style={styles.chipInfo}>
                    <Text style={styles.chipTitle} numberOfLines={1}>
                      {selectedBook.title}
                    </Text>
                    <Text style={styles.chipAuthor} numberOfLines={1}>
                      {selectedBook.author ?? selectedBook.authors?.[0] ?? 'Unknown'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedBook(null)} style={styles.chipRemove}>
                    <Icon name="x" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Toolbar */}
              <View style={styles.toolbar}>
                <Icon name="image"  size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                <Icon name="camera" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                <Icon name="mic"    size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                <TouchableOpacity
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => setShowBookModal(true)}
                >
                  <Icon
                    name="book"
                    size={20}
                    color={selectedBook ? COLORS.primary : COLORS.textSecondary}
                    style={styles.toolIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.postBtn, (!content.trim() || loading) && { opacity: 0.45 }]}
            onPress={handlePost}
            disabled={!content.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="black" size="small" />
              : <Text style={styles.postBtnText}>{postToEdit ? 'Lưu' : 'Đăng'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Book Search Modal ────────────────────────────────────────────────
          IMPORTANT: Modal must be a sibling of KeyboardAvoidingView (outside it)
          so it renders above everything and its TouchableOpacity are not clipped.
      ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={showBookModal}
        animationType="slide"
        transparent
        statusBarTranslucent      // Android: render above status bar
        onRequestClose={() => setShowBookModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đính kèm Sách</Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setShowBookModal(false)}
              >
                <Icon name="x" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={styles.modalSearchBox}>
              <Icon name="search" size={16} color={COLORS.textSecondary} style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Tìm tên sách..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={handleSearchBook}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setBookResults([]); }}>
                  <Icon name="x-circle" size={16} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                </TouchableOpacity>
              )}
            </View>

            {/* Results */}
            {searching ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={bookResults}
                keyExtractor={item => item.id}
                style={{ marginTop: 8 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  searchQuery.length > 1
                    ? <Text style={styles.emptyText}>Không tìm thấy sách nào.</Text>
                    : <Text style={styles.emptyText}>Nhập ít nhất 2 ký tự để tìm sách.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => {
                      setSelectedBook(item);
                      setSearchQuery('');
                      setBookResults([]);
                      setShowBookModal(false);
                    }}
                  >
                    <Image
                      source={{ uri: item.coverUrl ?? item.coverImage }}
                      style={styles.resultCover}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.resultAuthor}>
                        {item.author ?? (item.authors?.[0] ?? 'Unknown')}
                      </Text>
                      {(item.averageRating ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                          <Icon name="star" size={12} color="#FFD700" />
                          <Text style={styles.resultRating}>
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
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333',
  },
  cancelText:  { color: COLORS.text, fontSize: 16 },
  headerTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },

  body: { flex: 1, padding: SPACING.m },
  row:  { flexDirection: 'row' },

  avatar: {
    width: 42, height: 42, borderRadius: 21,
    marginRight: 12, backgroundColor: '#333',
  },
  inputContainer: { flex: 1 },
  username: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  input:    { color: COLORS.text, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },

  // Book chip
  bookChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', padding: 10, borderRadius: 10,
    marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#333',
  },
  chipCover:  { width: 32, height: 48, borderRadius: 4, marginRight: 10 },
  chipInfo:   { flex: 1 },
  chipTitle:  { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  chipAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  chipRemove: { padding: 6 },

  // Toolbar
  toolbar:  { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  toolIcon: { marginRight: 22 },

  footer: { paddingHorizontal: SPACING.m, paddingBottom: SPACING.m, alignItems: 'flex-end' },
  postBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 9,
    borderRadius: 20, minWidth: 72, alignItems: 'center',
  },
  postBtnText: { color: 'black', fontWeight: 'bold', fontSize: 15 },

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