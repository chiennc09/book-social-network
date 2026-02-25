import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { userService } from '../../services/user.service'; // Import service
import { feedService } from '../../services/feed.service';
import FeedItem from '../../components/feed/FeedItem';
import { useFocusEffect } from '@react-navigation/native'; // Để reload lại data khi quay lại màn hình
import { UserProfile } from '../../types/user';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hàm fetch data tách riêng để tái sử dụng
  const fetchProfile = async (pageNum = 1) => {
    try {
      const [userData, postsData] = await Promise.all([
         pageNum === 1 ? userService.getProfile() : Promise.resolve(user),
         feedService.getMyPosts(pageNum, 10)
      ]);
      
      if (pageNum === 1) {
         if (userData) setUser(userData);
         setPosts(postsData);
      } else {
         setPosts(prev => {
            const newPosts = postsData.filter((item: any) => !prev.some(p => p.id === item.id));
            return [...prev, ...newPosts];
         });
      }
      setHasMore(postsData.length === 10);
      
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Gọi API khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      fetchProfile(1);
    }, [])
  );

  // Lắng nghe xoá bài
  useEffect(() => {
     const sub = eventEmitter.on(EventNames.POST_DELETED, (data: any) => {
         setPosts(prev => prev.filter(p => p.id !== data.id));
     });
     return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.text} />
      </View>
    );
  }

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
       setLoadingMore(true);
       const nextPage = page + 1;
       setPage(nextPage);
       fetchProfile(nextPage);
    }
  };

  const onRefresh = () => {
     setRefreshing(true);
     setPage(1);
     setHasMore(true);
     fetchProfile(1);
  };

  const displayedPosts = posts.filter(p => activeTab === 'posts' ? !p.isRepost : p.isRepost);

  const renderHeader = () => (
    <View style={{ marginBottom: 10 }}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="globe" size={24} color={COLORS.text} />
          <View style={styles.headerRight}>
             {/* SỬA ĐOẠN NÀY: Gọi openDrawer() */}
             <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Icon name="menu" size={28} color={COLORS.text} />
             </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info - Data from API */}
        <View style={styles.infoContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.displayName}>{user?.displayName}</Text>
            <View style={styles.usernameRow}>
               <Text style={styles.username}>{user?.username}</Text>
               <View style={styles.badge}><Text style={styles.badgeText}>reads.net</Text></View>
            </View>
            {/* Hiển thị Bio */}
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
          <Image source={{ uri: user?.avatar }} style={styles.avatar} />
        </View>

        <Text style={styles.followers}>{user?.followersCount} người theo dõi</Text>

        {/* Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.btnOutline} 
            onPress={() => navigation.navigate('EditProfile', { user })} // Truyền data sang màn edit
          >
            <Text style={styles.btnText}>Chỉnh sửa trang cá nhân</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnOutline}>
            <Text style={styles.btnText}>Chia sẻ trang cá nhân</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs & Content */}
        <View style={styles.tabs}>
           <TouchableOpacity 
             style={[styles.tabItem, activeTab === 'posts' && styles.activeTab]}
             onPress={() => setActiveTab('posts')}
           >
             <Text style={activeTab === 'posts' ? styles.activeTabText : styles.tabText}>Bài viết</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.tabItem, activeTab === 'reposts' && styles.activeTab]}
             onPress={() => setActiveTab('reposts')}
           >
             <Text style={activeTab === 'reposts' ? styles.activeTabText : styles.tabText}>Đăng lại</Text>
           </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={displayedPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedItem post={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.feedPlaceholder}>
              <Text style={styles.placeholderText}>Chưa có bài đăng nào.</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={COLORS.text} /> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (Giữ nguyên styles cũ của bạn)
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.m },
  headerRight: { flexDirection: 'row', gap: 15 },
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.l, marginTop: SPACING.s },
  textContainer: { flex: 1, paddingRight: 10 },
  displayName: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  username: { color: COLORS.text, fontSize: 14 },
  badge: { backgroundColor: '#1E1E1E', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 5 },
  badgeText: { color: '#777', fontSize: 11 },
  bio: { color: COLORS.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#333' },
  followers: { color: COLORS.textSecondary, marginLeft: SPACING.l, marginTop: SPACING.s, fontSize: 14 },
  actionButtons: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.l, marginTop: SPACING.m },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  tabs: { flexDirection: 'row', marginTop: SPACING.l, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 1, borderBottomColor: COLORS.text },
  activeTabText: { color: COLORS.text, fontWeight: 'bold' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  feedPlaceholder: { marginTop: 50, alignItems: 'center' },
  placeholderText: { color: COLORS.textSecondary },
});

export default ProfileScreen;