import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { profileApi } from '../../api/profileApi';
import { UserProfile } from '../../types/user';

const FriendManagementScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incoming, setIncoming] = useState<UserProfile[]>([]);
  const [outgoing, setOutgoing] = useState<UserProfile[]>([]);
  
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, incomingRes, outgoingRes]: any = await Promise.all([
        profileApi.getFriends(),
        profileApi.getIncomingRequests(),
        profileApi.getOutgoingRequests()
      ]);
      setFriends(friendsRes.result || friendsRes.data?.result || friendsRes.data || []);
      setIncoming(incomingRes.result || incomingRes.data?.result || incomingRes.data || []);
      setOutgoing(outgoingRes.result || outgoingRes.data?.result || outgoingRes.data || []);
    } catch (e) {
      console.error("Failed to load friend data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccept = async (userId: string) => {
    try {
      await profileApi.acceptFriend(userId);
      fetchData(); // reload
    } catch (e) { console.error(e); }
  };

  const handleRemove = async (userId: string) => {
    try {
      await profileApi.removeFriend(userId);
      fetchData(); // reload
    } catch (e) { console.error(e); }
  };

  const renderFriendItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.userRow}>
      <Image source={{ uri: item.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName || item.username}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <TouchableOpacity style={styles.btnRemove} onPress={() => handleRemove(item.userId || item.id)}>
        <Text style={styles.btnTextOutline}>Hủy bạn</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item, isOutgoing }: { item: UserProfile, isOutgoing: boolean }) => (
    <View style={styles.userRow}>
      <Image source={{ uri: item.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName || item.username}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      {isOutgoing ? (
        <View style={styles.btnPending}>
          <Text style={styles.btnTextSecondary}>Đang chờ</Text>
        </View>
      ) : (
        <View style={{flexDirection: 'row', gap: 10}}>
           <TouchableOpacity style={styles.btnAccept} onPress={() => handleAccept(item.userId || item.id)}>
             <Text style={styles.btnTextPrimary}>Chấp nhận</Text>
           </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const getActiveData = () => {
     if (activeTab === 'friends') return friends;
     return [...incoming.map(i => ({...i, _kind: 'in'})), ...outgoing.map(o => ({...o, _kind: 'out'}))];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bạn bè</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={activeTab === 'friends' ? styles.activeTabText : styles.tabText}>Bạn bè ({friends.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={activeTab === 'requests' ? styles.activeTabText : styles.tabText}>Lời mời ({incoming.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
         <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.text} />
         </View>
      ) : (
         <FlatList
           data={getActiveData() as any}
           keyExtractor={(item) => item.userId || item.id + (item._kind || '')}
           renderItem={({ item }) => {
              if (activeTab === 'friends') return renderFriendItem({ item });
              return renderRequestItem({ item, isOutgoing: item._kind === 'out' });
           }}
           ListEmptyComponent={
             <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có ai ở đây cả.</Text>
             </View>
           }
         />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m,
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  backButton: { marginRight: SPACING.m },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 1, borderBottomColor: COLORS.text },
  activeTabText: { color: COLORS.text, fontWeight: 'bold' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
  
  userRow: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: COLORS.border + '50'
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333' },
  userInfo: { flex: 1, marginLeft: 15 },
  displayName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  username: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
  
  btnRemove: {
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
  },
  btnTextOutline: { color: COLORS.text, fontWeight: '600' },
  
  btnAccept: {
    backgroundColor: COLORS.text, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8
  },
  btnTextPrimary: { color: COLORS.background, fontWeight: 'bold' },
  
  btnPending: {
    backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 6
  },
  btnTextSecondary: { color: COLORS.textSecondary, fontWeight: '600' }
});

export default FriendManagementScreen;
