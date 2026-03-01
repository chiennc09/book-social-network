import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ActivityIndicator, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { profileApi } from '../../api/profileApi';
import { Badge, UserProfile } from '../../types/user';
import { userService } from '../../services/user.service';

const ChallengeScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Hiệu ứng scale nhấp nháy liên tục cho badge (Pulse effect)
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [badgesRes, leaderboardRes, userProf] = await Promise.all([
           profileApi.getAllBadges().catch(() => ({ result: [] })),
           profileApi.getLeaderboard().catch(() => ({ result: [] })),
           userService.getProfile().catch(() => null)
        ]);

        const badgesData = (badgesRes as any).result || (badgesRes as any).data?.result || [];
        setBadges(badgesData.sort((a: Badge, b: Badge) => a.requiredBooks - b.requiredBooks));

        const lbData = (leaderboardRes as any).result || (leaderboardRes as any).data?.result || [];
        setLeaderboard(lbData);

        setCurrentUser(userProf);
      } catch (e) {
        console.error("Lỗi lấy dữ liệu thủ thách:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const renderBadgeItem = ({ item, index }: { item: Badge, index: number }) => {
    // Top 3 badges có viền đặc biệt
    const isTopBadge = badges.length - index <= 3; 

    // Kiểm tra xem badge này có phải là badge hiện tại của User không
    const userBadges = currentUser?.badges || [];
    const isOwned = userBadges.some(b => b.code === item.code);

    return (
      <View style={[styles.badgeCard, isOwned && styles.ownedBadgeCard]}>
        <View style={styles.badgeLeft}>
           <Animated.View style={[
              styles.iconWrapper, 
              // Áp dụng animation nếu user sở hữu danh hiệu này
              isOwned && { transform: [{ scale: pulseAnim }], borderColor: '#FFD700', borderWidth: 2 }
           ]}>
              {item.iconUrl ? (
                 <Image source={{ uri: item.iconUrl }} style={styles.badgeImage} />
              ) : (
                 <Icon name="award" size={32} color={isOwned ? '#FFD700' : (isTopBadge ? '#FFD700' : '#666')} />
              )}
           </Animated.View>
        </View>

        <View style={styles.badgeInfo}>
           <Text style={[styles.badgeName, isOwned && styles.ownedBadgeName, isTopBadge && !isOwned && styles.topBadgeName]}>{item.name}</Text>
           <Text style={styles.badgeDescription}>{item.description}</Text>
           <Text style={[styles.badgeReq, isOwned && { color: '#FFD700' }]}>
              {isOwned ? "Đã Mở Khóa" : `Yêu cầu: Đọc ${item.requiredBooks} cuốn`}
           </Text>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: any, index: number }) => {
    const isTop1 = index === 0;
    const isTop2 = index === 1;
    const isTop3 = index === 2;

    let rankColor = '#888';
    if (isTop1) rankColor = '#FFD700'; // Vàng
    if (isTop2) rankColor = '#C0C0C0'; // Bạc
    if (isTop3) rankColor = '#CD7F32'; // Đồng

    const isMe = currentUser?.id === item.userId;

    return (
      <View style={[styles.lbCard, isMe && styles.lbCardMe]}>
        <Text style={[styles.lbRank, { color: rankColor }]}>{index + 1}</Text>
        <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.displayName || item.username || 'User'}&background=random` }} style={styles.lbAvatar} />
        
        <View style={styles.lbInfo}>
           <Text style={[styles.lbName, isMe && { color: '#FFD700' }]} numberOfLines={1}>{item.displayName || item.username}</Text>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Icon name="book" size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.lbBooksRead}>{item.totalBooksRead || 0} sách đã đọc</Text>
           </View>
        </View>

        {/* Hiển thị badge top của user đó */}
        {item.badges && item.badges.length > 0 && (
          <View style={styles.lbBadgeWrap}>
             {item.badges[0].iconUrl ? (
                 <Image source={{ uri: item.badges[0].iconUrl }} style={styles.lbBadgeIcon} />
             ) : (
                 <Icon name="award" size={16} color="#FFD700" />
             )}
          </View>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'badges' && styles.activeTabItem]}
        onPress={() => setActiveTab('badges')}
      >
        <Text style={[styles.tabText, activeTab === 'badges' && styles.activeTabText]}>Danh Hiệu</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'leaderboard' && styles.activeTabItem]}
        onPress={() => setActiveTab('leaderboard')}
      >
        <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Bảng Xếp Hạng</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="x" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bảng Xếp Hạng & Danh Hiệu</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'badges' && (
           <Text style={styles.slogan}>Đọc sách mỗi ngày để mở khóa danh hiệu mới!</Text>
        )}
        
        {loading ? (
           <ActivityIndicator size="large" color={COLORS.text} style={{marginTop: 50}} />
        ) : (
           activeTab === 'badges' ? (
              <FlatList
                data={badges}
                keyExtractor={item => item.code}
                renderItem={renderBadgeItem}
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
              />
           ) : (
              <FlatList
                data={leaderboard}
                keyExtractor={item => item.userId || item.id}
                renderItem={renderLeaderboardItem}
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 }}>Chưa có dữ liệu xếp hạng</Text>}
              />
           )
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
     padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#222' 
  },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  
  content: { flex: 1, padding: SPACING.m, paddingTop: 0 },
  slogan: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 15, fontStyle: 'italic' },

  // Tabs
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: '#FFD700' },
  tabText: { color: '#888', fontSize: 15, fontWeight: 'bold' },
  activeTabText: { color: '#FFD700' },

  // Badges
  badgeCard: { 
     flexDirection: 'row', backgroundColor: '#181818', 
     borderRadius: 16, padding: 15, marginBottom: 15,
     alignItems: 'center', borderWidth: 1, borderColor: '#333'
  },
  ownedBadgeCard: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' },
  badgeLeft: { marginRight: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapper: {
     width: 56, height: 56, borderRadius: 28, backgroundColor: '#222',
     justifyContent: 'center', alignItems: 'center',
     borderWidth: 1, borderColor: '#444'
  },
  badgeImage: { width: 36, height: 36, resizeMode: 'contain' },
  
  badgeInfo: { flex: 1 },
  badgeName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  topBadgeName: { color: '#FFD700', textShadowColor: 'rgba(255, 215, 0, 0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 10 },
  ownedBadgeName: { color: '#FFD700' },
  badgeDescription: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 8, lineHeight: 18 },
  badgeReq: { color: '#4ECDC4', fontSize: 12, fontWeight: '600' },

  // Leaderboard
  lbCard: { flexDirection: 'row', backgroundColor: '#181818', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  lbCardMe: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' },
  lbRank: { width: 30, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  lbAvatar: { width: 44, height: 44, borderRadius: 22, marginHorizontal: 12 },
  lbInfo: { flex: 1, justifyContent: 'center' },
  lbName: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  lbBooksRead: { color: COLORS.textSecondary, fontSize: 13 },
  lbBadgeWrap: { padding: 6, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 20 },
  lbBadgeIcon: { width: 16, height: 16, resizeMode: 'contain' }
});

export default ChallengeScreen;
