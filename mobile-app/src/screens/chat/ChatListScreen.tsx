import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, SafeAreaView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { chatApi } from '../../api/chatApi';
import { profileApi } from '../../api/profileApi';
import { DEFAULT_AVATAR, COLORS, SPACING } from '../../constants/theme';
import { resolveMediaUrl } from '../../config/env';
import Icon from 'react-native-vector-icons/Feather';
import FloatingTabBar from '../../components/navigation/FloatingTabBar';
import { useTabBarScrollControl } from '../../navigation/BottomTabNavigator';

const ChatListScreen = ({ navigation }: any) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Chat Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const { onScroll } = useTabBarScrollControl();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response: any = await chatApi.myConversations();
      const items = response.result || response.data?.result || [];
      // Sort by modifiedDate descending
      setConversations(items.sort((a: any, b: any) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => navigation.push('ChatRoom', { 
            conversationId: item.id, 
            conversationName: item.conversationName,
            conversationAvatar: item.conversationAvatar 
        })}
      >
        <Image style={styles.avatar} source={{ uri: resolveMediaUrl(item.conversationAvatar, 'avatars') || DEFAULT_AVATAR }} />
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{item.conversationName}</Text>
          <Text style={styles.chatPreview} numberOfLines={1}>
             {item.lastMessage ? item.lastMessage.content || item.lastMessage.message || 'Tin nhắn mới' : 'Chưa có tin nhắn'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleLoadFriends = async () => {
    try {
      setLoadingFriends(true);
      const response: any = await profileApi.getFriends();
      const items = response.result || response.data?.result || response.data || [];
      setFriends(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const openNewChatModal = () => {
    setIsModalVisible(true);
    handleLoadFriends();
  };

  const createChat = async (targetId: string, displayName: string, avatarUrl: string) => {
    setIsModalVisible(false);
    try {
      setLoading(true);
      const response: any = await chatApi.createConversation({
         participantIds: [targetId],
         type: 'DIRECT'
      });
      const conv = response.result || response.data?.result || response.data;
      if (conv) {
         setLoading(false);
         navigation.push('ChatRoom', { 
            conversationId: conv.id, 
            conversationName: conv.conversationName || displayName,
            conversationAvatar: conv.conversationAvatar || avatarUrl
         });
      }
    } catch (e) {
      console.error('Failed to create/get conversation', e);
      setLoading(false);
    }
  };

  const renderFriendItem = ({ item }: { item: any }) => {
     let actualId = item.id;
     if (item.userId) actualId = item.userId; // handle mapped response

     return (
       <TouchableOpacity 
          style={styles.chatItem} 
          onPress={() => createChat(actualId, item.displayName || item.username, item.avatar || DEFAULT_AVATAR)}
       >
          <Image style={styles.avatar} source={{ uri: resolveMediaUrl(item.avatar, 'avatars') || DEFAULT_AVATAR }} />
          <View style={styles.chatInfo}>
            <Text style={styles.chatName}>{item.displayName || item.username}</Text>
            <Text style={styles.chatPreview}>@{item.username}</Text>
          </View>
       </TouchableOpacity>
     );
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.text}/></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openNewChatModal}>
        <Icon name="message-square" size={24} color={COLORS.background} />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
         <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Nhắn tin mới</Text>
               <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Icon name="x" size={24} color={COLORS.text} />
               </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
               <Icon name="search" size={20} color={COLORS.textSecondary} />
               <TextInput 
                  style={styles.searchInput} 
                  placeholder="Tìm kiếm bạn bè..." 
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
               />
            </View>
            {loadingFriends ? (
               <ActivityIndicator style={{marginTop: 20}} color={COLORS.text} />
            ) : (
               <FlatList 
                  data={friends.filter(f => (f.displayName || f.username).toLowerCase().includes(searchQuery.toLowerCase()))}
                  keyExtractor={item => item.id || item.userId || Math.random().toString()}
                  renderItem={renderFriendItem}
                  ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy bạn bè nào</Text>}
               />
            )}
         </View>
      </Modal>
      <FloatingTabBar activeTab="Chatbot" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  chatItem: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center'
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  chatInfo: { marginLeft: SPACING.m, flex: 1 },
  chatName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  chatPreview: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.text, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.m, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: SPACING.m },
  searchInput: { flex: 1, color: COLORS.text, marginLeft: 8 }
});

export default ChatListScreen;
