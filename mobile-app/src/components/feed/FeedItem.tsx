import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, DEFAULT_AVATAR } from '../../constants/theme';
import { Post } from '../../types';
import { feedService } from '../../services/feed.service';
import { postApi } from '../../api/postApi';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { RankBadge } from '../common/RankBadge';
import { resolveMediaUrl } from '../../config/env';
import { useTheme } from '../../context/ThemeContext';

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
  const [content, setContent] = useState(post.content);
  const [book, setBook] = useState(post.book);
  const { colors, isDarkMode } = useTheme();

  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  // Tính toán Avatar: Nếu post này là của user đang đăng nhập, ưu tiên dùng Avatar trong Redux 
  // (để cập nhật tức thời khi đổi ảnh)
  const isMyPost = post.user.id === (currentUser as any)?.id;
  const rawAvatar = isMyPost && (currentUser as any)?.avatar 
       ? (currentUser as any).avatar 
       : (post.user.avatar || DEFAULT_AVATAR);
  const displayAvatar = resolveMediaUrl(rawAvatar, 'avatars');

  React.useEffect(() => {
     const subscription = eventEmitter.on(EventNames.POST_UPDATED, (updatedPost: any) => {
        if (updatedPost.id === post.id) {
           if (updatedPost.likesCount !== undefined) setLikesCount(updatedPost.likesCount);
           if (updatedPost.isLiked !== undefined) setIsLiked(updatedPost.isLiked);
           if (updatedPost.commentsCount !== undefined) setCommentsCount(updatedPost.commentsCount);
           if (updatedPost.repostsCount !== undefined) setRepostsCount(updatedPost.repostsCount);
           if (updatedPost.content !== undefined) setContent(updatedPost.content);
           if (updatedPost.book !== undefined) setBook(updatedPost.book);
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
    const myId = (currentUser as any)?.id || (currentUser as any)?.userId;
    // Compare by id or username — backend may return either
    const isOwner =
      myId && (
        post.user.id === myId ||
        post.userId  === myId ||
        post.user.username === (currentUser as any)?.username
      );

    if (isOwner) {
      Alert.alert('Tùy chọn', 'Bạn muốn làm gì với bài viết này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chỉnh sửa bài viết', onPress: () => {
            navigation.navigate('NewThread', { postToEdit: { id: post.id, content, book } });
          }
        },
        {
          text: 'Xóa bài viết', style: 'destructive', onPress: async () => {
            try {
              await postApi.deletePost(post.id);
              eventEmitter.emit(EventNames.POST_DELETED, { id: post.id });
            } catch (e) { console.error('Lỗi xóa bài', e); }
          },
        },
      ]);
    }
    // Non-owners: no-op (could add "Report" etc in future)
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      {/* 1. Avatar (Cột trái) */}
      <View style={styles.leftColumn}>
        <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: post.user.id || post.userId })}>
           <Image source={{ uri: displayAvatar }} style={styles.avatar} />
        </TouchableOpacity>
        {/* Đường nối thread nếu cần */}
        <View style={[styles.threadLine, { backgroundColor: colors.border }]} /> 
      </View>

      {/* 2. Nội dung (Cột phải) */}
      <View style={styles.rightColumn}>
        
        {/* Header: Tên & Thời gian */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: post.user.id || post.userId })}>
             <Text style={[styles.displayName, { color: colors.text }]}>{post.userDisplayName || post.user.displayName || post.user.username}</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
             {post.userBadges && post.userBadges.length > 0 && (
                <RankBadge 
                   badge={post.userBadges[0]} 
                   showGlow={false} 
                   style={{ marginLeft: 6, paddingVertical: 1, paddingHorizontal: 5 }} 
                />
             )}
             <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
             <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{post.timestamp}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={handleMoreOptions}>
            <Icon name="more-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Nội dung text */}
        <Text style={[styles.content, { color: colors.text }]}>{content}</Text>

        {/* --- BOOK TAGGING CARD --- */}
        {book && (
          <TouchableOpacity 
             style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}
             onPress={() => navigation.navigate('BookDetail', { bookId: book?.id })}
          >
            <Image source={{ uri: book.coverUrl || book.coverImage }} style={styles.bookCover} />
            <View style={styles.bookInfo}>
              <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>{book.title}</Text>
              <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>{book?.author || (book.authors ? book.authors[0] : 'Unknown')}</Text>
              <View style={[styles.ratingBadge, { backgroundColor: isDarkMode ? '#333' : 'rgba(217, 119, 6, 0.12)' }]}>
                 <Icon name="star" size={10} color={isDarkMode ? '#FFD700' : '#D97706'} />
                 <Text style={[styles.ratingText, { color: isDarkMode ? '#FFFFFF' : '#D97706' }]}>{book.averageRating || 0}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Ảnh bài đăng (nếu có) */}
        {post.images && post.images.length > 0 && (
          <View style={styles.imageContainer}>
             <Image source={{ uri: post.images[0] }} style={[styles.postImage, { borderColor: colors.border }]} />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Icon name="heart" size={20} color={isLiked ? "red" : colors.text} />
            <Text style={[styles.actionText, { color: colors.textSecondary }, isLiked && { color: 'red' }]}>{likesCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={styles.actionBtn} 
             onPress={() => {
                if (!isDetail) navigation.navigate('CommentScreen', { postId: post.id, post: post });
             }}
          >
            <Icon name="message-circle" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleRepost} disabled={hasReposted}>
            <Icon name="repeat" size={20} color={hasReposted ? colors.primary : colors.text} />
            <Text style={[styles.actionText, { color: colors.textSecondary }, hasReposted && { color: colors.primary }]}>{repostsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="send" size={20} color={colors.text} />
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
  feedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 6 },
  feedBadgeIcon: { width: 10, height: 10, marginRight: 2 },
  feedBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', marginLeft: 2 },
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