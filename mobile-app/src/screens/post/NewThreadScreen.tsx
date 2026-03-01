import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, ActivityIndicator, Modal, FlatList } from 'react-native';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import { postApi } from '../../api/postApi';
import { bookApi } from '../../api/bookApi';
import Icon from 'react-native-vector-icons/Feather';
import { Book } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';

const NewThreadScreen = ({ navigation }: any) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Book Search Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searching, setSearching] = useState(false);
  
  const { user } = useSelector((state: RootState) => state.auth);

  const handlePost = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const resp = await postApi.createPost({
        content,
        bookId: selectedBook?.id,
      });
      eventEmitter.emit(EventNames.POST_CREATED, resp);
      navigation.goBack();
    } catch (error) {
       console.error(error);
       setLoading(false);
    }
  };

  const handleSearchBook = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
       setSearching(true);
      try {
         const res: any = await bookApi.search(text);
         const dataList = res.data?.result || res.result?.data || res.result || [];
         setBookResults(dataList.map((item: any) => {
             let coverUrl = item.coverImage || item.coverUrl;
             if (coverUrl && !coverUrl.startsWith('http')) {
                coverUrl = `http://10.0.2.2:8085/books/files/covers/${coverUrl}`;
             }
             return {
                 id: item.id,
                 title: item.title,
                 authors: item.authors,
                 author: item.authors?.[0] || 'Unknown',
                 coverUrl: coverUrl,
                 averageRating: item.averageRating || 0,
             };
         }));
       } catch(e) {}
       setSearching(false);
    } else {
       setBookResults([]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bài viết mới</Text>
        <View style={{ width: 30 }} /> 
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
           <Image source={{ uri: (user as any)?.avatarUrl || (user as any)?.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
           <View style={styles.inputContainer}>
              <Text style={styles.username}>{(user as any)?.displayName || user?.username}</Text>
              <TextInput 
                placeholder="Có gì mới?" 
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                multiline
                autoFocus
                value={content}
                onChangeText={setContent}
              />
              
              {/* Vùng Book Preview */}
              {selectedBook && (
                <View style={styles.bookPreview}>
                   <Image source={{ uri: selectedBook.coverUrl || selectedBook.coverImage }} style={styles.bookPreviewCover} />
                   <View style={styles.bookPreviewInfo}>
                     <Text style={styles.bookPreviewTitle} numberOfLines={1}>{selectedBook.title}</Text>
                     <Text style={styles.bookPreviewAuthor} numberOfLines={1}>{selectedBook.author || (selectedBook.authors ? selectedBook.authors[0] : 'Unknown')}</Text>
                   </View>
                   <TouchableOpacity onPress={() => setSelectedBook(null)} style={{padding: 5}}>
                      <Icon name="x" size={18} color={COLORS.textSecondary} />
                   </TouchableOpacity>
                </View>
              )}

              {/* Toolbar Icons */}
              <View style={styles.toolbar}>
                 <Icon name="image" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                 <Icon name="camera" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                 <Icon name="mic" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                 <TouchableOpacity onPress={() => setShowBookModal(true)}>
                    <Icon name="book" size={20} color={selectedBook ? COLORS.primary : COLORS.textSecondary} style={styles.toolIcon} /> 
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </View>
      
      <View style={styles.footer}>
         <TouchableOpacity 
            style={[styles.postBtn, (!content.trim() || loading) && { opacity: 0.5 }]}
            onPress={handlePost}
            disabled={!content.trim() || loading}
         >
            {loading ? <ActivityIndicator color="black" /> : <Text style={styles.postBtnText}>Đăng</Text>}
         </TouchableOpacity>
      </View>

      {/* Book Search Modal */}
      <Modal visible={showBookModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Đính kèm Sách</Text>
                 <TouchableOpacity onPress={() => setShowBookModal(false)}>
                    <Icon name="x" size={24} color={COLORS.text} />
                 </TouchableOpacity>
              </View>
              <TextInput 
                style={styles.searchInput}
                placeholder="Tìm tên sách..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={handleSearchBook}
              />
              {searching ? (
                <ActivityIndicator color={COLORS.primary} style={{marginTop: 20}} />
              ) : (
                <FlatList 
                  data={bookResults}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => (
                    <TouchableOpacity 
                      style={styles.bookResultItem}
                      onPress={() => {
                        setSelectedBook(item);
                        setShowBookModal(false);
                      }}
                    >
                      <Image source={{ uri: item.coverUrl || item.coverImage }} style={styles.bookResultCover} />
                      <View style={{flex: 1}}>
                        <Text style={styles.bookResultTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.bookResultAuthor}>{item.author || (item.authors ? item.authors[0] : 'Unknown')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Icon name="star" size={14} color="#FFD700" />
                          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginLeft: 4 }}>
                            {item.averageRating && item.averageRating > 0 ? item.averageRating.toFixed(1) : 'Chưa có đánh giá'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  style={{marginTop: 10}}
                />
              )}
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.m, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#333' },
  cancelText: { color: COLORS.text, fontSize: 16 },
  headerTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  content: { padding: SPACING.m, flex: 1 },
  row: { flexDirection: 'row' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  inputContainer: { flex: 1 },
  username: { color: COLORS.text, fontWeight: 'bold', marginBottom: 4 },
  input: { color: COLORS.text, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'row', marginTop: 10 },
  toolIcon: { marginRight: 20 },
  footer: { padding: SPACING.m, alignItems: 'flex-end' },
  postBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: 'black', fontWeight: 'bold' },

  bookPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#333' },
  bookPreviewCover: { width: 30, height: 45, borderRadius: 4, marginRight: 10 },
  bookPreviewInfo: { flex: 1 },
  bookPreviewTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  bookPreviewAuthor: { color: COLORS.textSecondary, fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  searchInput: { backgroundColor: '#1E1E1E', color: COLORS.text, padding: 10, borderRadius: 8, fontSize: 16 },
  bookResultItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#333', alignItems: 'center' },
  bookResultCover: { width: 40, height: 60, marginRight: 10, borderRadius: 4 },
  bookResultTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold' },
  bookResultAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }
});

export default NewThreadScreen;