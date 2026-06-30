import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { libraryService, LibraryBook } from '../../services/library.service';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import ShareBookModal from '../../components/library/ShareBookModal';
import { useTabBarScrollControl } from '../../navigation/BottomTabNavigator';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const LibraryScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'reading' | 'want_to_read' | 'read'>('reading');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { onScroll } = useTabBarScrollControl();
  const { colors } = useTheme();

  // Fetch data khi đổi Tab
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      const data = await libraryService.getMyBooks(activeTab);
      setBooks(data);
      setLoading(false);
    };
    fetchBooks();
  }, [activeTab]);

  // Nhận tín hiệu update tiến trình realtime
  useEffect(() => {
     const subscription = eventEmitter.on(EventNames.BOOK_PROGRESS_UPDATED, (data: any) => {
        setBooks(prevBooks => 
            prevBooks.map(book => {
               if (book.id === data.bookId) {
                  return { ...book, progress: data.progressPercent };
               }
               return book;
            })
        );
     });
     return () => subscription.remove();
  }, []);

  // --- COMPONENTS CON ---

  // 1. Component Tab chuyển đổi
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['reading', 'want_to_read', 'read'].map((key) => {
        const labels: Record<string, string> = { reading: 'Đang đọc', want_to_read: 'Muốn đọc', read: 'Đã đọc' };
        const isActive = activeTab === key;
        return (
          <TouchableOpacity 
            key={key} 
            style={[styles.tabItem, isActive && [styles.activeTabItem, { borderBottomColor: colors.text }]]}
            onPress={() => setActiveTab(key as any)}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, isActive && [styles.activeTabText, { color: colors.text }]]}>{labels[key]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // 2. Component hiển thị từng cuốn sách
  const renderBookItem = ({ item }: { item: LibraryBook }) => {
    const calculatedPage = Math.round((item.progress / 100) * (item.totalPage || 0));

    return (
      <TouchableOpacity 
        style={[styles.bookCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
      >
        {/* Ảnh bìa */}
        <Image source={{ uri: item.coverUrl }} style={[styles.bookCover, { backgroundColor: colors.border }]} />
        
        {/* Thông tin */}
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>{item.author}</Text>
          
          {/* HIỂN THỊ TRẠNG THÁI KHÁC NHAU TÙY TAB */}
          
          {/* A. Tab Đang đọc -> Hiện Progress Bar */}
          {item.status === 'reading' && (
            <View style={styles.progressSection}>
               <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: colors.text, width: `${Math.min(100, item.progress)}%` }]} />
               </View>
               <View style={styles.progressTextRow}>
                  <Text style={[styles.progressText, { color: colors.text }]}>{item.progress.toFixed(1)}%</Text>
                  <Text style={[styles.pageText, { color: colors.textSecondary }]}>{calculatedPage}/{item.totalPage || '?'} trang</Text>
               </View>
               {item.startDate && <Text style={[styles.dateText, { color: colors.textSecondary }]}>Bắt đầu: {item.startDate}</Text>}
            </View>
          )}

          {/* B. Tab Đã đọc -> Hiện ngày xong & Đánh giá */}
          {item.status === 'read' && (
            <View style={styles.readSection}>
               <View style={styles.ratingRow}>
                 {[1, 2, 3, 4, 5].map((star) => (
                   <Icon key={star} name="star" size={12} color={(item.rating || 0) >= star ? '#FFD700' : colors.border} style={{marginRight: 2}} />
                 ))}
               </View>
               {item.finishedDate && <Text style={[styles.dateText, { color: colors.textSecondary }]}>Hoàn thành: {item.finishedDate}</Text>}
            </View>
          )}

          {/* C. Tab Muốn đọc -> Hiện nút thêm */}
          {item.status === 'want_to_read' && (
             <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.border }]} onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}>
                <Text style={[styles.startBtnText, { color: colors.text }]}>Bắt đầu đọc</Text>
             </TouchableOpacity>
          )}
        </View>

        {/* Nút 3 chấm menu */}
        <TouchableOpacity style={styles.menuBtn}>
           <Icon name="more-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // 3. Footer Buttons (Thử thách & Thống kê)
  const renderFooter = () => (
    <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
      <Text style={[styles.footerTitle, { color: colors.text }]}>Hoạt động</Text>
      <View style={styles.footerRow}>
        <TouchableOpacity style={[styles.footerCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Challenge')}>
           <View style={[styles.iconBox, { backgroundColor: '#FF6B6B' }]}>
              <Icon name="target" size={24} color="white" />
           </View>
           <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Thử thách</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Mục tiêu năm 2026</Text>
           </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.footerCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShareModalVisible(true)}>
           <View style={[styles.iconBox, { backgroundColor: '#4ECDC4' }]}>
              <Icon name="share-2" size={24} color="white" />
           </View>
           <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Chia sẻ sách</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Đóng góp cho cộng đồng</Text>
           </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tủ sách cá nhân</Text>
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* List Content */}
      <View style={{flex: 1}}>
        {loading ? (
            <ActivityIndicator color={colors.text} style={{marginTop: 50}} />
        ) : (
            <FlatList
                data={books}
                keyExtractor={(item) => item.id}
                renderItem={renderBookItem}
                contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
                ListFooterComponent={renderFooter}
                onScroll={onScroll}
                scrollEventThrottle={16}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="book" size={40} color={colors.border} />
                        <Text style={{color: colors.textSecondary, marginTop: 10}}>Tủ sách trống</Text>
                    </View>
                }
            />
        )}
      </View>

      <ShareBookModal 
         visible={shareModalVisible} 
         onClose={() => setShareModalVisible(false)} 
         onSuccess={() => {
            // Có thể reload lại tủ sách hoặc navigate
         }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.m, paddingBottom: SPACING.s },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },

  // Tabs Styles
  tabContainer: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginBottom: 10 },
  tabItem: { paddingVertical: 8, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabItem: { borderBottomColor: COLORS.text },
  tabText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  activeTabText: { color: COLORS.text },

  // Book Item Styles
  bookCard: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', padding: 12, borderRadius: 12 },
  bookCover: { width: 70, height: 105, borderRadius: 6, resizeMode: 'cover' },
  bookInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' }, // Dàn đều chiều dọc
  bookTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', lineHeight: 22 },
  bookAuthor: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  menuBtn: { marginLeft: 5 },

  // Logic hiển thị trạng thái riêng
  progressSection: { marginTop: 4 },
  progressBarBg: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.text }, // Màu trắng hoặc màu brand
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },
  pageText: { color: COLORS.textSecondary, fontSize: 11 },
  dateText: { color: '#555', fontSize: 11, marginTop: 4 },

  readSection: { marginTop: 4 },
  ratingRow: { flexDirection: 'row', marginBottom: 4 },

  startBtn: { backgroundColor: '#333', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 8 },
  startBtnText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },

  // Footer / Buttons Style
  footerContainer: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#222' },
  footerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerCard: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#333'
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  cardSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },

  emptyState: { alignItems: 'center', marginTop: 50 },
});

export default LibraryScreen;

