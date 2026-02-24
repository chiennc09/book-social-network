import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { userService} from '../../services/user.service'; // Import service
import { useFocusEffect } from '@react-navigation/native'; // Để reload lại data khi quay lại màn hình
import { UserProfile } from '../../types/user';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Hàm fetch data tách riêng để tái sử dụng
  const fetchProfile = async () => {
    try {
      // setLoading(true); // Nếu muốn hiện loading mỗi lần quay lại
      const data = await userService.getProfile();
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi màn hình được focus (vừa vào hoặc back từ EditProfile về)
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
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

        {/* Tabs & Content (Giữ nguyên) */}
        <View style={styles.tabs}>
           <View style={[styles.tabItem, styles.activeTab]}>
             <Text style={styles.activeTabText}>Bài viết</Text>
           </View>
           <View style={styles.tabItem}>
             <Text style={styles.tabText}>Đăng lại</Text>
           </View>
        </View>
        
        <View style={styles.feedPlaceholder}>
            <Text style={styles.placeholderText}>Chưa có bài đăng nào.</Text>
        </View>

      </ScrollView>
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