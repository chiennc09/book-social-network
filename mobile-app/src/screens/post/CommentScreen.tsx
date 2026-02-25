import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { postApi } from '../../api/postApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

const CommentScreen = ({ route, navigation }: any) => {
  const { postId } = route.params;
  const [comments, setComments] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Redux auth user for display
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res: any = await postApi.getComments(postId, 1, 50);
      setComments(res.result?.data || res.data?.result?.data || []);
    } catch (error) {
      console.error("Lỗi lấy comment", error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!inputText.trim()) return;
    setSubmitting(true);
    try {
      await postApi.addComment(postId, { content: inputText.trim() });
      setInputText('');
      // Refresh list
      fetchComments();
    } catch (error) {
      console.error("Lỗi gửi comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <Image source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${item.username}&background=random` }} style={styles.avatar} />
      <View style={styles.commentContent}>
         <View style={styles.commentHeader}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.timestamp}>{item.created || 'Vừa xong'}</Text>
         </View>
         <Text style={styles.text}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <Icon name="x" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bình luận</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
         <ActivityIndicator color={COLORS.text} style={{marginTop: 20}} />
      ) : (
         <FlatList
           data={comments}
           keyExtractor={(item) => item.id}
           renderItem={renderComment}
           contentContainerStyle={{ padding: SPACING.m }}
           ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>}
         />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
         <View style={styles.inputContainer}>
            <Image source={{ uri: (user as any)?.avatarUrl || (user as any)?.avatar || 'https://ui-avatars.com/api/?name=User' }} style={styles.inputAvatar} />
            <TextInput
               style={styles.input}
               placeholder="Thêm bình luận..."
               placeholderTextColor={COLORS.textSecondary}
               value={inputText}
               onChangeText={setInputText}
               multiline
            />
            <TouchableOpacity 
               style={[styles.postButton, !inputText.trim() && { opacity: 0.5 }]} 
               onPress={submitComment}
               disabled={!inputText.trim() || submitting}
            >
               {submitting ? <ActivityIndicator size="small" color="black" /> : <Text style={styles.postButtonText}>Đăng</Text>}
            </TouchableOpacity>
         </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.m, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  
  commentItem: { flexDirection: 'row', marginBottom: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  username: { color: COLORS.text, fontWeight: 'bold', fontSize: 13 },
  timestamp: { color: COLORS.textSecondary, fontSize: 12 },
  text: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },

  inputContainer: { flexDirection: 'row', padding: SPACING.m, borderTopWidth: 0.5, borderTopColor: '#333', alignItems: 'flex-end' },
  inputAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, marginBottom: 4 },
  input: { flex: 1, color: COLORS.text, minHeight: 40, maxHeight: 100, borderRadius: 20, backgroundColor: '#1A1A1A', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, marginRight: 10 },
  postButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginBottom: 2, justifyContent: 'center' },
  postButtonText: { color: 'black', fontWeight: 'bold' }
});

export default CommentScreen;
