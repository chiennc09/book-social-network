import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Text, RefreshControl, Image, Animated, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { feedService } from '../../services/feed.service';
import FeedItem from '../../components/feed/FeedItem';
import { userService } from '../../services/user.service';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useTabBarScrollControl } from '../../navigation/BottomTabNavigator';
import { useTheme } from '../../context/ThemeContext';

const HomeScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const filterParam = route.params?.filter || 'foryou'; // Nhận từ Drawer

  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { colors, isDarkMode } = useTheme();
  
  // Lấy avatar hiện tại từ Redux để update realtime
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Animation cho nút FAB
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFAB, setShowFAB] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Hook điều khiển BottomTab auto-hide khi cuộn
  const { onScroll: onTabBarScroll } = useTabBarScrollControl();

  const fetchFeed = async (pageNum = 1) => {
    try {
      const [feedData, userData] = await Promise.all([
        feedService.getFeed(filterParam, pageNum, 10),
        pageNum === 1 ? userService.getProfile() : Promise.resolve(currentUser)
      ]);
      
      if (pageNum === 1) {
         setPosts(feedData);
         if (userData) setCurrentUser(userData);
      } else {
         // Filter out duplicates just in case
         setPosts(prev => {
            const newPosts = feedData.filter((item: any) => !prev.some(p => p.id === item.id));
            return [...prev, ...newPosts];
         });
      }
      
      setHasMore(feedData.length === 10);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchFeed(1);
  }, [filterParam]); // Gọi lại khi filter Params từ drawer thay đổi

  // Lắng nghe tạo/xoá bài
  useEffect(() => {
     const subDelete = eventEmitter.on(EventNames.POST_DELETED, (data: any) => {
         setPosts(prev => prev.filter(p => p.id !== data.id));
     });
     
     const subCreate = eventEmitter.on(EventNames.POST_CREATED, async (apiResp: any) => {
         // apiResp shape: { code, result: { id, content, userId, bookId, ... } }
         const item = apiResp?.result ?? apiResp;
         if (!item?.id) return; // guard — ignore malformed events
         
         // Resolve book details if attached
         let bookObj = undefined;
         if (item.bookId) {
            try {
               const { bookService } = require('../../services/book.service');
               bookObj = await bookService.getBookDetails(item.bookId);
            } catch(e) {}
         }
         
         // Use authUser directly — it's already in Redux and always up-to-date
         const newPost = {
            id: item.id,
            user: {
              id: item.userId,
              username: item.username || authUser?.username,
              displayName: (authUser as any)?.displayName || authUser?.username,
              // Avatar priority: Redux authUser → currentUser → fallback
              avatar: (authUser as any)?.avatar || currentUser?.avatar || DEFAULT_AVATAR,
              badges: (authUser as any)?.badges || currentUser?.badges || [],
            },
            content: item.content || '',
            book: bookObj,
            likesCount: 0,
            commentsCount: 0,
            repostsCount: 0,
            timestamp: 'Vừa xong',
            isLiked: false,
            isRepost: item.isRepost || false,
         };
         
         setPosts(prev => [newPost, ...prev]);
     });

     return () => {
         subDelete.remove();
         subCreate.remove();
     }
  }, [currentUser, authUser]);

  // Xử lý hiệu ứng hiện/ẩn FAB + BottomTab khi cuộn
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // FAB visibility
    if (offsetY > 100 && !showFAB) {
      setShowFAB(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else if (offsetY <= 100 && showFAB) {
      setShowFAB(false);
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }

    // BottomTab auto-hide
    onTabBarScroll(event);
  }, [showFAB, fadeAnim, onTabBarScroll]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchFeed(1);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
       setLoadingMore(true);
       const nextPage = page + 1;
       setPage(nextPage);
       fetchFeed(nextPage);
    }
  };

  // 1. Header Navigation (Logo, Menu)
  const renderNavHeader = () => (
    <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconBtn}>
        <Icon name="menu" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.logoContainer}>
        <Icon name="book-open" size={20} color={isDarkMode ? '#00E5FF' : '#00838F'} style={{ marginRight: 6 }} />
        <Text style={[styles.logoText, { color: colors.text }]}>
          Book<Text style={{ color: isDarkMode ? '#00E5FF' : '#00838F', fontWeight: 'bold' }}>Social</Text>
        </Text>
      </View>
      <View style={{ width: 30 }} />
    </View>
  );

  // 2. Header Input (Phần "Có gì mới?") - ListHeaderComponent
  const renderInputHeader = () => {
    if (!currentUser) return null;
    return (
      <View style={styles.inputHeaderContainer}>
        <View style={styles.inputRow}>
           <Image source={{ uri: (authUser as any)?.avatar || currentUser.avatar || DEFAULT_AVATAR }} style={styles.avatarSmall} />
           <TouchableOpacity 
              style={styles.fakeInput}
              onPress={() => navigation.navigate('NewThread')} // Mở modal
           >
             <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Có gì mới?</Text>
           </TouchableOpacity>
           
           <TouchableOpacity style={[styles.postButtonSmall, { backgroundColor: colors.card }]} disabled>
              <Text style={[styles.postButtonText, { color: isDarkMode ? '#555' : '#888' }]}>Đăng</Text>
           </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      {renderNavHeader()}
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.text} style={{marginTop: 20}} />
      ) : (
        <View style={{flex: 1}}>
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <FeedItem post={item} />}
              
              // Gắn Header Input vào đây
              ListHeaderComponent={renderInputHeader}
              
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />}
              contentContainerStyle={{ paddingBottom: 80 }}
              
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={colors.text} /> : null}
              
              // Lắng nghe sự kiện cuộn
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />

            {/* 3. Nút FAB (Floating Action Button) */}
            <Animated.View style={[styles.fabContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
               <TouchableOpacity 
                  style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.border }]} 
                  onPress={() => navigation.navigate('NewThread')}
                  activeOpacity={0.8}
               >
                  <Icon name="plus" size={28} color={isDarkMode ? 'black' : 'white'} />
               </TouchableOpacity>
            </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Nav Header
  navHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s,
    borderBottomWidth: 0.5, borderBottomColor: '#333',
  },
  iconBtn: { width: 30, alignItems: 'flex-start' },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // Input Header Styles
  inputHeaderContainer: { paddingHorizontal: SPACING.m, paddingTop: SPACING.m },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  fakeInput: { flex: 1, marginHorizontal: 12, height: 36, justifyContent: 'center' },
  placeholderText: { color: COLORS.textSecondary, fontSize: 15 },
  postButtonSmall: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  postButtonText: { color: '#555', fontWeight: '600', fontSize: 14 },
  divider: { height: 0.5, backgroundColor: '#333', marginTop: SPACING.m },

  // FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary, // Màu trắng hoặc màu chủ đạo
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#ccc'
  }
});

export default HomeScreen;