import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { userService } from '../../services/user.service';
import { feedService } from '../../services/feed.service';
import FeedItem from '../../components/feed/FeedItem';
import { useFocusEffect } from '@react-navigation/native';
import { UserProfile } from '../../types/user';
import { RankBadge } from '../../components/common/RankBadge';
import { profileApi } from '../../api/profileApi';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  
  // Dùng Redux user để cập nhật realtime ảnh đại diện
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hàm fetch data tách riêng để tái sử dụng
  const fetchProfile = async (pageNum = 1) => {
    try {
      const [userData, postsData, friendsData, incomingData] = await Promise.all([
         pageNum === 1 ? userService.getProfile() : Promise.resolve(user),
         feedService.getMyPosts(pageNum, 10),
         pageNum === 1 ? profileApi.getFriends() : Promise.resolve(null),
         pageNum === 1 ? profileApi.getIncomingRequests() : Promise.resolve(null),
      ]);
      
      if (pageNum === 1) {
         if (userData) setUser(userData);
         setPosts(postsData);
         
         const friendsList = friendsData?.result || friendsData?.data?.result || friendsData?.data || [];
         setFriendsCount(friendsList.length);
         
         const incomingList = incomingData?.result || incomingData?.data?.result || incomingData?.data || [];
         setPendingCount(incomingList.length);
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
             <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ position: 'relative', padding: 2 }}>
                <Icon name="menu" size={28} color={COLORS.text} />
                {pendingCount > 0 && (
                   <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{pendingCount}</Text>
                   </View>
                )}
             </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info - Data from API */}
        <View style={styles.infoContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.displayName}>{user?.displayName}</Text>
            <View style={styles.usernameRow}>
               <Text style={styles.username}>@{user?.username}</Text>
               <View style={styles.badge}><Text style={styles.badgeText}>reads.net</Text></View>
               
               {/* Render Badges with Animation */}
               {user?.badges && user.badges.length > 0 && user.badges.map((b, index) => (
                  <RankBadge key={b.code || index} badge={b} />
               ))}
            </View>
            {/* Hiển thị Bio */}
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
          <Image source={{ uri: (authUser as any)?.avatar || user?.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
        </View>

        {/* Friends Status */}
        <TouchableOpacity 
           onPress={() => navigation.navigate('FriendManagement')}
           style={styles.followersRow}
        >
           <Icon name="users" size={15} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
           <Text style={styles.followers}>{friendsCount} bạn bè</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.btnOutline, { backgroundColor: COLORS.text, borderColor: COLORS.text }]}
            onPress={() => navigation.navigate('EditProfile', { user })}
          >
            <Text style={[styles.btnText, { color: COLORS.background }]}>Chỉnh sửa trang cá nhân</Text>
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
        keyExtractor={(item) => item.id || String(Math.random())}
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
  followersRow: { flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.l, marginTop: SPACING.s, paddingVertical: 4 },
  followers: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
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
  menuBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  menuBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;