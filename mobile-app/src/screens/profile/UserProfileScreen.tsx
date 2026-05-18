import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Animated, FlatList } from 'react-native';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { userService } from '../../services/user.service';
import { feedService } from '../../services/feed.service';
import { profileApi } from '../../api/profileApi';
import { chatApi } from '../../api/chatApi';
import { UserProfile } from '../../types/user';
import FeedItem from '../../components/feed/FeedItem';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import FloatingTabBar from '../../components/navigation/FloatingTabBar';
import { useTabBarScrollControl } from '../../navigation/BottomTabNavigator';
import { RankBadge } from '../../components/common/RankBadge';

const UserProfileScreen = ({ route, navigation }: any) => {
  const { userId } = route.params;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { onScroll } = useTabBarScrollControl();

  const fetchProfileAndPosts = async (pageNum = 1) => {
    try {
      const [userData, postsData] = await Promise.all([
         pageNum === 1 ? userService.getUserProfile(userId) : Promise.resolve(user),
         feedService.getUserPosts(userId, pageNum, 10)
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
      console.error('Failed to fetch user profile data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchProfileAndPosts(1);
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [userId]);

  // Lắng nghe xoá bài
  useEffect(() => {
     const sub = eventEmitter.on(EventNames.POST_DELETED, (data: any) => {
         setPosts(prev => prev.filter(p => p.id !== data.id));
     });
     return () => sub.remove();
  }, []);

  const handleInteract = async (action: string) => {
    if (!user) return;
    const targetId = user.userId || user.id;
    try {
      if (action === 'ADD')    await profileApi.sendFriendRequest(targetId);
      if (action === 'ACCEPT') {
        await profileApi.acceptFriend(targetId);
        // Auto-create the DIRECT chat room — idempotent if already exists
        chatApi.createConversation({ participantIds: [targetId], type: 'DIRECT' })
          .catch(e => console.warn('[UserProfile] chatApi.createConversation failed:', e));
      }
      if (action === 'REMOVE') await profileApi.removeFriend(targetId);
      fetchProfileAndPosts(1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartChat = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const targetUserId = user.userId || user.id;
      const response: any = await chatApi.createConversation({
        participantIds: [targetUserId],
        type: 'DIRECT'
      });
      const conv = response.result || response.data?.result || response.data;
      if (conv) {
        setLoading(false);
        navigation.push('ChatRoom', { 
            conversationId: conv.id, 
            conversationName: conv.conversationName || user.displayName || user.username 
        });
      }
    } catch (e) {
      console.error('Failed to create/get conversation', e);
      setLoading(false);
    }
  };

  const renderActionButtons = () => {
    if (!user) return null;
    switch(user.relationship) {
       case 'FRIEND':
         return (
           <View style={{flexDirection: 'row', gap: 10}}>
             <TouchableOpacity style={styles.btnOutline} onPress={() => handleInteract('REMOVE')}>
               <Text style={styles.btnText}>Huỷ kết bạn</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.btnPrimary} onPress={handleStartChat}>
               <Text style={styles.btnTextPrimary}>Nhắn tin</Text>
             </TouchableOpacity>
           </View>
         );
       case 'PENDING_INCOMING':
         return (
           <View style={{flexDirection: 'row', gap: 10}}>
             <TouchableOpacity style={styles.btnPrimary} onPress={() => handleInteract('ACCEPT')}>
               <Text style={styles.btnTextPrimary}>Chấp nhận</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.btnOutline} onPress={() => handleInteract('REMOVE')}>
               <Text style={styles.btnText}>Từ chối</Text>
             </TouchableOpacity>
           </View>
         );
       case 'PENDING_OUTGOING':
         return (
           <TouchableOpacity style={styles.btnOutline} onPress={() => handleInteract('REMOVE')}>
             <Text style={styles.btnText}>Huỷ lời mời</Text>
           </TouchableOpacity>
         );
       case 'SELF':
         return null; // Không hiện núi nếu là màn hình của chính mình đang bị gọi nhầm qua route này
       default:
       case 'NONE':
         return (
           <TouchableOpacity style={styles.btnPrimary} onPress={() => handleInteract('ADD')}>
             <Text style={styles.btnTextPrimary}>Thêm Bạn Bè</Text>
           </TouchableOpacity>
         );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.text} />
      </View>
    );
  }

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
       setLoadingMore(true);
       const nextPage = page + 1;
       setPage(nextPage);
       fetchProfileAndPosts(nextPage);
    }
  };

  const onRefresh = () => {
     setRefreshing(true);
     setPage(1);
     setHasMore(true);
     fetchProfileAndPosts(1);
  };

  const displayedPosts = posts.filter(p => activeTab === 'posts' ? !p.isRepost : p.isRepost);

  const renderHeader = () => (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 5}}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user?.username || 'Hồ sơ'}</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.displayName}>{user?.displayName}</Text>
          <View style={styles.usernameRow}>
             <Text style={styles.username}>{user?.username}</Text>
             <View style={styles.badge}><Text style={styles.badgeText}>reads.net</Text></View>
             
             {user?.badges && user.badges.length > 0 && user.badges.map((b, index) => (
                <RankBadge key={b.code || index} badge={b} />
             ))}
          </View>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>
        <Image source={{ uri: user?.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
      </View>

      <Text style={styles.followers}>{user?.friendCount || 0} bạn bè</Text>

      <View style={styles.actionButtons}>
         {renderActionButtons()}
      </View>

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
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={COLORS.text} /> : null}
      />
      <FloatingTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.l, marginTop: SPACING.m },
  textContainer: { flex: 1, paddingRight: 10 },
  displayName: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  username: { color: COLORS.text, fontSize: 14 },
  badge: { backgroundColor: '#1E1E1E', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 5 },
  badgeText: { color: '#777', fontSize: 11 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)', borderWidth: 1, borderColor: '#FFD700', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeIcon: { width: 14, height: 14, marginRight: 4, resizeMode: 'contain' },
  rankBadgeText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  bio: { color: COLORS.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#333' },
  followers: { color: COLORS.textSecondary, marginLeft: SPACING.l, marginTop: SPACING.s, fontSize: 14 },
  actionButtons: { paddingHorizontal: SPACING.l, marginTop: SPACING.l },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  btnPrimary: { flex: 1, backgroundColor: COLORS.text, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  btnTextPrimary: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },
  tabs: { flexDirection: 'row', marginTop: SPACING.l, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 1, borderBottomColor: COLORS.text },
  activeTabText: { color: COLORS.text, fontWeight: 'bold' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  feedPlaceholder: { marginTop: 50, alignItems: 'center' },
  placeholderText: { color: COLORS.textSecondary },
});

export default UserProfileScreen;
