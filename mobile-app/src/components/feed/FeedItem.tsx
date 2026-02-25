import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../../constants/theme';
import { Post } from '../../types';
import { feedService } from '../../services/feed.service';
import { postApi } from '../../api/postApi';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

const { width } = Dimensions.get('window');

interface FeedItemProps {
  post: Post;
  isDetail?: boolean;
}

const FeedItem = ({ post, isDetail = false }: FeedItemProps) => {
  const navigation = useNavigation<any>();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount || 0);
  const [hasReposted, setHasReposted] = useState(false); // Valid chỉ 1 lần

  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
     const subscription = eventEmitter.on(EventNames.POST_UPDATED, (updatedPost: any) => {
        if (updatedPost.id === post.id) {
           if (updatedPost.likesCount !== undefined) setLikesCount(updatedPost.likesCount);
           if (updatedPost.isLiked !== undefined) setIsLiked(updatedPost.isLiked);
           if (updatedPost.commentsCount !== undefined) setCommentsCount(updatedPost.commentsCount);
           if (updatedPost.repostsCount !== undefined) setRepostsCount(updatedPost.repostsCount);
        }
     });
     return () => subscription.remove();
  }, [post.id]);

  const handleLike = async () => {
    const originallyLiked = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    try {
      if (isLiked) {
        await feedService.unlikePost(post.id);
      } else {
        await feedService.likePost(post.id);
      }
      eventEmitter.emit(EventNames.POST_UPDATED, { id: post.id, isLiked: !originallyLiked, likesCount: originallyLiked ? likesCount - 1 : likesCount + 1 });
    } catch (e) {
      setIsLiked(originallyLiked);
      setLikesCount(originallyLiked ? likesCount + 1 : likesCount - 1);
    }
  };

  const handleRepost = async () => {
    if (hasReposted) return; // Chặn spam đăng lại

    // Tối ưu UI (Optimistic Update)
    const originalCount = repostsCount;
    setRepostsCount(originalCount + 1);
    setHasReposted(true);
    eventEmitter.emit(EventNames.POST_UPDATED, { id: post.id, repostsCount: originalCount + 1 });
    try {
       await postApi.createPost({ content: '', isRepost: true, originalPostId: post.id });
    } catch (e) {
       console.error("Repost failed", e);
       setRepostsCount(originalCount);
       setHasReposted(false);
       eventEmitter.emit(EventNames.POST_UPDATED, { id: post.id, repostsCount: originalCount });
    }
  };

  const handleMoreOptions = () => {
    // Chỉ chủ bài post mới được xoá
    if (post.user.id === (currentUser as any)?.id) {
       Alert.alert("Tùy chọn", "Bạn muốn làm gì với bài viết này?", [
         { text: "Hủy", style: "cancel" },
         { text: "Xóa bài viết", style: "destructive", onPress: async () => {
            try {
               await postApi.deletePost(post.id);
               eventEmitter.emit(EventNames.POST_DELETED, { id: post.id });
            } catch(e) { console.error("Lỗi xóa bài", e); }
         }}
       ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Avatar (Cột trái) */}
      <View style={styles.leftColumn}>
        <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
        {/* Đường nối thread nếu cần */}
        <View style={styles.threadLine} /> 
      </View>

      {/* 2. Nội dung (Cột phải) */}
      <View style={styles.rightColumn}>
        
        {/* Header: Tên & Thời gian */}
        <View style={styles.header}>
          <Text style={styles.displayName}>{post.user.displayName}</Text>
          <View style={styles.headerInfo}>
             <Text style={styles.username}>{post.user.username}</Text>
             <Text style={styles.dot}>•</Text>
             <Text style={styles.timestamp}>{post.timestamp}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={handleMoreOptions}>
            <Icon name="more-horizontal" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Nội dung text */}
        <Text style={styles.content}>{post.content}</Text>

        {/* --- BOOK TAGGING CARD --- */}
        {post.book && (
          <TouchableOpacity 
             style={styles.bookCard}
             onPress={() => navigation.navigate('BookDetail', { bookId: post.book?.id })}
          >
            <Image source={{ uri: post.book.coverUrl || post.book.coverImage }} style={styles.bookCover} />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={1}>{post.book.title}</Text>
              <Text style={styles.bookAuthor}>{post.book?.author || (post.book.authors ? post.book.authors[0] : 'Unknown')}</Text>
              <View style={styles.ratingBadge}>
                 <Icon name="star" size={10} color="#FFD700" />
                 <Text style={styles.ratingText}>{post.book.averageRating || 0}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Ảnh bài đăng (nếu có) */}
        {post.images && post.images.length > 0 && (
          <View style={styles.imageContainer}>
             <Image source={{ uri: post.images[0] }} style={styles.postImage} />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Icon name="heart" size={20} color={isLiked ? "red" : COLORS.text} />
            <Text style={[styles.actionText, isLiked && { color: 'red' }]}>{likesCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={styles.actionBtn} 
             onPress={() => {
                if (!isDetail) navigation.navigate('CommentScreen', { postId: post.id, post: post });
             }}
          >
            <Icon name="message-circle" size={20} color={COLORS.text} />
            <Text style={styles.actionText}>{commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleRepost} disabled={hasReposted}>
            <Icon name="repeat" size={20} color={hasReposted ? COLORS.primary : COLORS.text} />
            <Text style={[styles.actionText, hasReposted && { color: COLORS.primary }]}>{repostsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="send" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
    backgroundColor: COLORS.background,
  },
  leftColumn: { alignItems: 'center', marginRight: SPACING.m },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  threadLine: { flex: 1, width: 2, backgroundColor: '#333', marginTop: 10, borderRadius: 1 },
  
  rightColumn: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  displayName: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  headerInfo: { flexDirection: 'row', flex: 1, marginLeft: 6 },
  username: { color: COLORS.textSecondary, fontSize: 14 },
  dot: { color: COLORS.textSecondary, marginHorizontal: 4 },
  timestamp: { color: COLORS.textSecondary, fontSize: 14 },
  moreBtn: { padding: 4 },

  content: { color: COLORS.text, fontSize: 15, marginTop: 4, lineHeight: 22 },

  // Style cho Book Card
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A', // Màu nền hơi sáng hơn nền chính
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  bookCover: { width: 40, height: 60, borderRadius: 4, resizeMode: 'cover' },
  bookInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  bookTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  bookAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: '#333', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingText: { color: 'white', fontSize: 10, marginLeft: 2, fontWeight: 'bold' },

  // Style ảnh bài đăng
  imageContainer: { marginTop: 10 },
  postImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover', borderWidth: 1, borderColor: '#333' },

  actions: { flexDirection: 'row', marginTop: 12, gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: COLORS.textSecondary, fontSize: 13 },
});

export default FeedItem;