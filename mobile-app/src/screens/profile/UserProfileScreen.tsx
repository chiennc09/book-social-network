import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Animated } from 'react-native';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { userService } from '../../services/user.service';
import { profileApi } from '../../api/profileApi';
import { UserProfile } from '../../types/user';

const UserProfileScreen = ({ route, navigation }: any) => {
  const { userId } = route.params;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Lấy dữ liệu profile của người dùng khác
  const fetchProfile = async () => {
    try {
      const userData = await userService.getUserProfile(userId);
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [userId]);

  const handleInteract = async (action: string) => {
    if (!user) return;
    try {
      if (action === 'ADD') await profileApi.sendFriendRequest(user.userId || user.id);
      if (action === 'ACCEPT') await profileApi.acceptFriend(user.userId || user.id);
      if (action === 'REMOVE') await profileApi.removeFriend(user.userId || user.id);
      fetchProfile(); // reload trạng thái 
    } catch (e) {
      console.error(e);
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
             <TouchableOpacity style={styles.btnPrimary}>
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
                <Animated.View key={b.code || index} style={[styles.rankBadge, { transform: [{ scale: pulseAnim }] }]}>
                   {b.iconUrl ? (
                       <Image source={{uri: b.iconUrl}} style={styles.badgeIcon} />
                   ) : (
                       <Icon name="award" size={14} color="#FFD700" style={{marginRight: 4}} />
                   )}
                   <Text style={styles.rankBadgeText}>{b.name}</Text>
                </Animated.View>
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
});

export default UserProfileScreen;
