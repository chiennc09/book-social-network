import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Text, SafeAreaView, RefreshControl, Image, Animated } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { feedService } from '../../services/feed.service';
import FeedItem from '../../components/feed/FeedItem';
import { userService } from '../../services/user.service'; // Lấy info user hiện tại
import { EventNames, eventEmitter } from '../../utils/eventEmitter';

const HomeScreen = ({ route, navigation }: any) => {
  const filterParam = route.params?.filter || 'foryou'; // Nhận từ Drawer

  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Animation cho nút FAB
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFAB, setShowFAB] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Opacity 0 ban đầu

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
     
     const subCreate = eventEmitter.on(EventNames.POST_CREATED, async (data: any) => {
         // Data trả về từ createPost (response.result hoặc data trực tiếp tùy Cấu trúc API, giả sử data chính là bài post)
         // Map the post similar to feedService mapping
         const item = data.result || data;
         
         // Đợi xíu lấy Book info nếu có (Optimistic UI không nhất thiết, nhưng có thì đẹp)
         let bookObj = undefined;
         if (item.bookId) {
            try {
               const { bookService } = require('../../services/book.service');
               bookObj = await bookService.getBookDetails(item.bookId);
            } catch(e) {}
         }
         
         const newPost = {
            id: item.id,
            user: {
              id: item.userId,
              username: item.username,
              displayName: item.username, 
              avatar: currentUser?.avatar || `https://ui-avatars.com/api/?name=${item.username}&background=random`,
              badges: currentUser?.badges || [],
            },
            content: item.content,
            book: bookObj,
            likesCount: 0,
            commentsCount: 0,
            repostsCount: item.isRepost ? 1 : 0, 
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
  }, [currentUser]);

  // Xử lý hiệu ứng hiện/ẩn FAB khi cuộn
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    
    // Nếu cuộn xuống quá 100px thì hiện FAB
    if (offsetY > 100 && !showFAB) {
      setShowFAB(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } 
    // Nếu quay về gần đỉnh thì ẩn FAB
    else if (offsetY <= 100 && showFAB) {
      setShowFAB(false);
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  };

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

  // 1. Header Navigation (Logo, Menu) - Giữ nguyên
  const renderNavHeader = () => (
    <View style={styles.navHeader}>
      <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconBtn}>
        <Icon name="menu" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <Icon name="book-open" size={28} color={COLORS.text} />
      <TouchableOpacity style={styles.iconBtn}>
        <Icon name="search" size={24} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );

  // 2. Header Input (Phần "Có gì mới?") - ListHeaderComponent
  const renderInputHeader = () => {
    if (!currentUser) return null;
    return (
      <View style={styles.inputHeaderContainer}>
        <View style={styles.inputRow}>
           <Image source={{ uri: currentUser.avatar || 'https://ui-avatars.com/api/?name=User' }} style={styles.avatarSmall} />
           <TouchableOpacity 
              style={styles.fakeInput}
              onPress={() => navigation.navigate('NewThread')} // Mở modal
           >
             <Text style={styles.placeholderText}>Có gì mới?</Text>
           </TouchableOpacity>
           
           <TouchableOpacity style={styles.postButtonSmall} disabled>
              <Text style={styles.postButtonText}>Đăng</Text>
           </TouchableOpacity>
        </View>
        <View style={styles.divider} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderNavHeader()}
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.text} style={{marginTop: 20}} />
      ) : (
        <View style={{flex: 1}}>
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <FeedItem post={item} />}
              
              // Gắn Header Input vào đây
              ListHeaderComponent={renderInputHeader}
              
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
              contentContainerStyle={{ paddingBottom: 80 }}
              
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={COLORS.text} /> : null}
              
              // Lắng nghe sự kiện cuộn
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />

            {/* 3. Nút FAB (Floating Action Button) */}
            <Animated.View style={[styles.fabContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
               <TouchableOpacity 
                  style={styles.fab} 
                  onPress={() => navigation.navigate('NewThread')}
                  activeOpacity={0.8}
               >
                  <Icon name="plus" size={28} color="black" />
               </TouchableOpacity>
            </Animated.View>
        </View>
      )}
    </SafeAreaView>
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