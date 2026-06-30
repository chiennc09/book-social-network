import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import { resolveMediaUrl } from '../../config/env';
import { postApi } from '../../api/postApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import FeedItem from '../../components/feed/FeedItem';
import { userService } from '../../services/user.service';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { useTheme } from '../../context/ThemeContext';

// Sub-component cho mỗi Comment để có thể quản lý Replies riêng tư
const CommentItem = ({ item, level = 0, rootId, onReplyClick, authUser, navigation }: { item: any, level?: number, rootId?: string, onReplyClick: (username: string, parentId: string) => void, authUser?: any, navigation: any }) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const { colors, isDarkMode } = useTheme();

  // ID gốc của thread này, nếu đang ở cấp 0 thì chính là item.id, nếu cấp 1 thì dùng rootId truyền xuống
  const currentRootId = level === 0 ? item.id : rootId;

  const fetchReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setLoadingReplies(true);
    try {
      const res: any = await postApi.getReplies(item.postId, item.id, 1, 50);
      setReplies(res.result?.data || res.data?.result?.data || []);
      setShowReplies(true);
    } catch (e) {
      console.log('Error fetching replies', e);
    } finally {
      setLoadingReplies(false);
    }
  };

  return (
    <View style={[styles.commentItemRow, level > 0 && { paddingTop: 10 }]}>
      {/* Left Column - Avatar & Line */}
      <View style={styles.leftCol}>
        <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: item.userId })}>
           <Image 
              source={{ 
                uri: resolveMediaUrl(
                  (authUser && item.userId === (authUser.id || authUser.userId)) 
                    ? (authUser.avatar || authUser.avatarUrl || item.userAvatar) 
                    : item.userAvatar, 
                  'avatars'
                ) || DEFAULT_AVATAR 
              }} 
              style={[styles.avatar, { backgroundColor: colors.border }, level > 0 && { width: 28, height: 28, borderRadius: 14 }]} 
           />
        </TouchableOpacity>
        {/* Draw vertical line for level 0 if it has replies */}
        {level === 0 && item.replyCount > 0 && (
           <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />
        )}
      </View>
      
      {/* Right Column - Content & Nested Replies */}
      <View style={styles.rightCol}>
         <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: item.userId })} style={{flexDirection: 'row', alignItems: 'center'}}>
               <Text style={[styles.username, { color: colors.text }]}>{item.userDisplayName || item.username} {item.userId === rootId && <Text style={{color: colors.textSecondary, fontWeight: 'normal'}}>• Tác giả</Text>}</Text>
               {item.userBadges && item.userBadges.length > 0 && (
                  <View style={styles.feedBadge}>
                     {item.userBadges[0].iconUrl ? (
                        <Image source={{uri: item.userBadges[0].iconUrl}} style={styles.feedBadgeIcon} />
                     ) : (
                        <Icon name="award" size={10} color="#FFD700" />
                     )}
                  </View>
               )}
            </TouchableOpacity>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{item.created || 'Vừa xong'}</Text>
              <Icon name="more-horizontal" size={16} color={colors.textSecondary} style={{marginLeft: 10}} />
            </View>
         </View>
         <Text style={[styles.text, { color: colors.text }]}>{item.content}</Text>
         
         <View style={styles.commentActions}>
            <TouchableOpacity style={styles.actionBtn}>
               <Icon name="heart" size={16} color={colors.textSecondary} />
               <Text style={[styles.actionText, { color: colors.textSecondary }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onReplyClick(item.username, currentRootId!)}>
               <Icon name="message-circle" size={16} color={colors.textSecondary} />
               {item.replyCount > 0 && level > 0 ? <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.replyCount}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
               <Icon name="repeat" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
               <Icon name="send" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
         </View>

         {/* Nút hiển thị phản hồi for Root Comment */}
         {item.replyCount > 0 && level === 0 && (
           <TouchableOpacity style={styles.showRepliesBtn} onPress={fetchReplies}>
             <View style={[styles.replyHorizontalLine, { backgroundColor: colors.border }]} />
             {loadingReplies ? (
               <ActivityIndicator size="small" color={colors.textSecondary} />
             ) : (
               <Text style={[styles.showRepliesText, { color: colors.textSecondary }]}>
                 {showReplies ? 'Ẩn phản hồi' : `Hiển thị phản hồi`}
               </Text>
             )}
           </TouchableOpacity>
         )}

         {/* Render Replies inside Right Column to indent them automatically */}
         {showReplies && replies.map((reply: any) => (
            <CommentItem key={reply.id} item={reply} level={1} rootId={currentRootId} onReplyClick={onReplyClick} authUser={authUser} navigation={navigation} />
         ))}
      </View>
    </View>
  );
};

const CommentScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { postId, post } = route.params;
  const [comments, setComments] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post?.commentsCount || 0);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const { colors, isDarkMode } = useTheme();

  // Redux auth user for display
  const { user } = useSelector((state: RootState) => state.auth);
  const [myProfile, setMyProfile] = useState<any>(null);

  useEffect(() => {
    fetchComments();

    userService.getProfile()
      .then(profile => {
        setMyProfile(profile);
      })
      .catch(err => {
        console.error("Failed to load user profile in CommentScreen", err);
      });
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
    
    // Optimistic UI for Comment Count
    const newCount = localCommentsCount + 1;
    setLocalCommentsCount(newCount);
    
    try {
      const parentIdToSubmit = replyParentId && inputText.includes('@') ? replyParentId : undefined;
      await postApi.addComment(postId, { content: inputText.trim(), parentId: parentIdToSubmit });
      setInputText('');
      setReplyParentId(null);
      
      // Update FeedItem in background
      eventEmitter.emit(EventNames.POST_UPDATED, { id: postId, commentsCount: newCount });
      
      fetchComments();
    } catch (error) {
      console.error("Lỗi gửi comment", error);
      setLocalCommentsCount(localCommentsCount); // Revert
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyClick = (username: string, parentId: string) => {
     setInputText(`@${username} `);
     setReplyParentId(parentId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      {/* Header như app Threads */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Icon name="chevron-left" size={28} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Quay lại</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
           <Text style={[styles.headerTitle, { color: colors.text }]}>Bài viết</Text>
        </View>
        <View style={styles.headerRight}>
          <Icon name="bell" size={20} color={colors.text} />
          <Icon name="more-horizontal" size={20} color={colors.text} style={{marginLeft: 15}} />
        </View>
      </View>

      {loading && !post ? (
         <ActivityIndicator color={colors.text} style={{marginTop: 20}} />
      ) : (
         <FlatList
           data={comments}
           keyExtractor={(item) => item.id}
           renderItem={({ item }) => <CommentItem item={item} onReplyClick={handleReplyClick} authUser={myProfile || user} navigation={navigation} />}
           contentContainerStyle={{ paddingBottom: 80 }}
           ListHeaderComponent={() => (
             <>
                {post && <FeedItem post={post} isDetail={true} />}
                <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                   <Text style={[styles.filterText, { color: colors.text }]}>Liên quan nhất ⌄</Text>
                   <Text style={[styles.filterAction, { color: colors.textSecondary }]}>Xem hoạt động {'>'}</Text>
                </View>
             </>
           )}
           ListEmptyComponent={
             !loading ? <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có bình luận nào.</Text> : <ActivityIndicator color={colors.text} style={{marginTop: 20}} />
           }
         />
      )}

      {/* Input luôn ở dưới */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
         <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <Image source={{ uri: myProfile?.avatar || resolveMediaUrl((user as any)?.avatarUrl || (user as any)?.avatar, 'avatars') || DEFAULT_AVATAR }} style={styles.inputAvatar} />
            <TextInput
               style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
               placeholder={`Thêm câu trả lời...`}
               placeholderTextColor={colors.textSecondary}
               value={inputText}
               onChangeText={setInputText}
               multiline
            />
            <TouchableOpacity 
               style={[styles.postButton, { backgroundColor: colors.primary }, !inputText.trim() && { opacity: 0.5 }]} 
               onPress={submitComment}
               disabled={!inputText.trim() || submitting}
            >
               {submitting ? <ActivityIndicator size="small" color={isDarkMode ? 'black' : 'white'} /> : <Text style={[styles.postButtonText, { color: isDarkMode ? 'black' : 'white' }]}>Đăng</Text>}
            </TouchableOpacity>
         </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backText: { color: COLORS.text, fontSize: 16, marginLeft: 5 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.m, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  filterText: { color: COLORS.text, fontWeight: 'bold' },
  filterAction: { color: COLORS.textSecondary },

  commentItemRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, paddingTop: SPACING.m },
  leftCol: { alignItems: 'center', marginRight: 12, width: 36 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  verticalLine: { width: 1.5, flex: 1, backgroundColor: '#333', marginTop: 8, marginBottom: -SPACING.m },
  
  rightCol: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  username: { color: COLORS.text, fontWeight: 'bold', fontSize: 13 },
  timestamp: { color: COLORS.textSecondary, fontSize: 12 },
  text: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  
  commentActions: { flexDirection: 'row', marginTop: 8, gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: COLORS.textSecondary, fontSize: 12 },

  feedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 6 },
  feedBadgeIcon: { width: 10, height: 10, marginRight: 2 },

  // Đường gạch ngang nhỏ cho text "Hiển thị phản hồi"
  showRepliesBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: -35 }, 
  replyHorizontalLine: { width: 24, height: 1.5, backgroundColor: '#333', marginRight: 8, marginLeft: 20, borderBottomLeftRadius: 5 },
  showRepliesText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },

  inputContainer: { flexDirection: 'row', padding: SPACING.m, borderTopWidth: 0.5, borderTopColor: '#333', alignItems: 'flex-end', backgroundColor: '#181818' },
  inputAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, marginBottom: 4 },
  input: { flex: 1, color: COLORS.text, minHeight: 40, maxHeight: 100, borderRadius: 20, backgroundColor: '#1A1A1A', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, marginRight: 10 },
  postButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginBottom: 2, justifyContent: 'center' },
  postButtonText: { color: 'black', fontWeight: 'bold' }
});

export default CommentScreen;
