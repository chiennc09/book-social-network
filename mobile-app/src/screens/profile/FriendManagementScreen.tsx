// src/screens/profile/FriendManagementScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Image, TextInput, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { resolveMediaUrl } from '../../config/env';
import { UserAvatar } from '../../components/common/UserAvatar';
import { profileApi } from '../../api/profileApi';
import { UserProfile } from '../../types/user';
import FloatingTabBar from '../../components/navigation/FloatingTabBar';
import { chatApi } from '../../api/chatApi';
import { useTheme } from '../../context/ThemeContext';

type Tab = 'friends' | 'requests' | 'search';

const FriendManagementScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  const [friends, setFriends]   = useState<UserProfile[]>([]);
  const [incoming, setIncoming] = useState<UserProfile[]>([]);
  const [outgoing, setOutgoing] = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { colors, isDarkMode } = useTheme();

  // ── Load friend data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, incomingRes, outgoingRes]: any = await Promise.all([
        profileApi.getFriends(),
        profileApi.getIncomingRequests(),
        profileApi.getOutgoingRequests(),
      ]);
      setFriends(friendsRes.result   || friendsRes.data?.result   || friendsRes.data   || []);
      setIncoming(incomingRes.result || incomingRes.data?.result  || incomingRes.data  || []);
      setOutgoing(outgoingRes.result || outgoingRes.data?.result  || outgoingRes.data  || []);
    } catch (e) {
      console.error('Failed to load friend data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Search with debounce ──────────────────────────────────────────────────
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res: any = await profileApi.searchUsers(text.trim());
        setSearchResults(res?.result || res?.data?.result || res?.data || []);
      } catch (e) {
        console.error('Search users error', e);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAccept = async (userId: string) => {
    try {
      await profileApi.acceptFriend(userId);
      chatApi.createConversation({ participantIds: [userId], type: 'DIRECT' })
        .catch(e => console.warn('[handleAccept] chatApi.createConversation failed:', e));
      fetchData();
    } catch (e) { console.error('Accept friend error', e); }
  };

  const handleDecline = async (userId: string) => {
    try {
      await profileApi.declineFriend(userId);
      fetchData();
    } catch (e) {
      console.error('Decline friend error', e);
    }
  };

  const handleRemove = async (userId: string) => {
    try { await profileApi.removeFriend(userId); fetchData(); } catch (e) {}
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await profileApi.sendFriendRequest(userId);
      setSearchResults(prev =>
        prev.map(u => (u.userId === userId || u.id === userId) ? { ...u, _requestSent: true } as any : u),
      );
    } catch (e) { console.error('Add friend error', e); }
  };

  const openSearchTab = () => {
    setActiveTab('search');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderFriendItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: colors.border + '50' }]}
      onPress={() => navigation.navigate('UserProfile', { userId: item.userId || item.id })}
    >
      <UserAvatar url={item.avatar} size={50} style={[styles.avatar, { backgroundColor: colors.border }]} />
      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: colors.text }]}>{item.displayName || item.username}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
      </View>
      <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={() => handleRemove(item.userId || item.id)}>
        <Text style={[styles.btnTextOutline, { color: colors.text }]}>Hủy bạn</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: { item: UserProfile & { _kind?: string } }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: colors.border + '50' }]}
      onPress={() => navigation.navigate('UserProfile', { userId: item.userId || item.id })}
    >
      <UserAvatar url={item.avatar} size={50} style={[styles.avatar, { backgroundColor: colors.border }]} />
      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: colors.text }]}>{item.displayName || item.username}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
      </View>
      {item._kind === 'out' ? (
        <View style={styles.btnPending}>
          <Text style={[styles.btnTextSecondary, { color: colors.textSecondary }]}>Đang chờ</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.text }]} onPress={() => handleAccept(item.userId || item.id)}>
            <Text style={[styles.btnTextPrimary, { color: isDarkMode ? 'black' : 'white' }]}>Chấp nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={() => handleDecline(item.userId || item.id)}>
            <Text style={[styles.btnTextOutline, { color: colors.text }]}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSearchItem = ({ item }: { item: UserProfile & { _requestSent?: boolean } }) => {
    const itemId = item.userId || item.id;
    const isFriend  = friends.some(f => {
      const fId = f.userId || f.id;
      return !!fId && !!itemId && fId === itemId;
    });
    const isPending = outgoing.some(o => {
      const oId = o.userId || o.id;
      return !!oId && !!itemId && oId === itemId;
    }) || item._requestSent;

    return (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: colors.border + '50' }]}
        onPress={() => navigation.navigate('UserProfile', { userId: item.userId || item.id })}
      >
        <UserAvatar url={item.avatar} size={50} style={[styles.avatar, { backgroundColor: colors.border }]} />
        <View style={styles.userInfo}>
          <Text style={[styles.displayName, { color: colors.text }]}>{item.displayName || item.username}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
        {isFriend ? (
          <View style={styles.btnPending}><Text style={[styles.btnTextSecondary, { color: colors.textSecondary }]}>Bạn bè</Text></View>
        ) : isPending ? (
          <View style={styles.btnPending}><Text style={[styles.btnTextSecondary, { color: colors.textSecondary }]}>Đã gửi</Text></View>
        ) : (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.text }]} onPress={() => handleAddFriend(item.userId || item.id)}>
            <Icon name="user-plus" size={14} color={isDarkMode ? 'black' : 'white'} style={{ marginRight: 4 }} />
            <Text style={[styles.btnTextPrimary, { color: isDarkMode ? 'black' : 'white' }]}>Kết bạn</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const getRequestData = () => [
    ...incoming.map(i => ({ ...i, _kind: 'in' })),
    ...outgoing.map(o => ({ ...o, _kind: 'out' })),
  ];

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bạn bè</Text>
        <TouchableOpacity onPress={openSearchTab} style={styles.searchIconBtn}>
          <Icon name="user-plus" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {([
          { key: 'friends',  label: `Bạn bè (${friends.length})` },
          { key: 'requests', label: `Lời mời (${incoming.length})` },
          { key: 'search',   label: 'Tìm kiếm' },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && [styles.activeTab, { borderBottomColor: colors.text }]]}
            onPress={() => {
              setActiveTab(tab.key);
              if (tab.key === 'search') setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <Text style={activeTab === tab.key ? [styles.activeTabText, { color: colors.text }] : [styles.tabText, { color: colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar — shown when search tab is active */}
      {activeTab === 'search' && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="search" size={18} color={colors.textSecondary} style={{ marginLeft: 10 }} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm tên người dùng..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Icon name="x-circle" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      {loading && activeTab !== 'search' ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : activeTab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={item => `friend-${item.userId || item.id}`}
          renderItem={renderFriendItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<EmptyState text="Chưa có bạn bè nào." colors={colors} />}
        />
      ) : activeTab === 'requests' ? (
        <FlatList
          data={getRequestData() as any[]}
          keyExtractor={item => `req-${item.userId || item.id}-${item._kind}`}
          renderItem={renderRequestItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<EmptyState text="Không có lời mời kết bạn nào." colors={colors} />}
        />
      ) : (
        /* Search tab */
        searchLoading ? (
          <View style={styles.loader}><ActivityIndicator color={colors.text} /></View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={item => `search-${item.userId || item.id}`}
            renderItem={renderSearchItem as any}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              searchQuery.length > 0
                ? <EmptyState text="Không tìm thấy người dùng nào." colors={colors} />
                : <EmptyState text="Nhập tên để tìm kiếm bạn bè." colors={colors} />
            }
          />
        )
      )}
      <FloatingTabBar />
    </View>
  );
};

const EmptyState = ({ text, colors }: { text: string; colors: any }) => (
  <View style={styles.emptyContainer}>
    <Icon name="users" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton:    { marginRight: SPACING.m },
  searchIconBtn: { marginLeft: 'auto' },
  headerTitle:   { color: COLORS.text, fontSize: 18, fontWeight: 'bold', flex: 1 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab:      { borderBottomWidth: 2, borderBottomColor: COLORS.text },
  activeTabText:  { color: COLORS.text, fontWeight: 'bold' },
  tabText:        { color: COLORS.textSecondary, fontWeight: '600' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', margin: SPACING.m, borderRadius: 10,
    borderWidth: 1, borderColor: '#333',
  },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15 },

  loader:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText:      { color: COLORS.textSecondary, fontSize: 15, marginTop: 8 },

  userRow: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m,
    borderBottomWidth: 1, borderBottomColor: COLORS.border + '50',
  },
  avatar:      { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333' },
  userInfo:    { flex: 1, marginLeft: 12 },
  displayName: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  username:    { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.text, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
  },
  btnTextPrimary: { color: COLORS.background, fontWeight: 'bold', fontSize: 13 },

  btnOutline: {
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  btnTextOutline: { color: COLORS.text, fontWeight: '600', fontSize: 13 },

  btnPending: { paddingHorizontal: 12, paddingVertical: 6 },
  btnTextSecondary: { color: COLORS.textSecondary, fontWeight: '600' },
});

export default FriendManagementScreen;


