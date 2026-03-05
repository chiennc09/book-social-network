import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { chatApi } from '../../api/chatApi';
import { DEFAULT_AVATAR, COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';

const ChatListScreen = ({ navigation }: any) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            conversationName: item.conversationName 
        })}
      >
        <Image style={styles.avatar} source={{ uri: item.conversationAvatar || DEFAULT_AVATAR }} />
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{item.conversationName}</Text>
          <Text style={styles.chatPreview} numberOfLines={1}>Tin nhắn mới nhất...</Text>
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
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>}
      />
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
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 }
});

export default ChatListScreen;
