import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { Post } from '../../types';

const { width } = Dimensions.get('window');

interface FeedItemProps {
  post: Post;
}

const FeedItem = ({ post }: FeedItemProps) => {
  return (
    <View style={styles.container}>
      {/* 1. Avatar (Cột trái) */}
      <View style={styles.leftColumn}>
        <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
        {/* Đường nối thread nếu cần (giống Threads) */}
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
          <TouchableOpacity style={styles.moreBtn}>
            <Icon name="more-horizontal" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Nội dung text */}
        <Text style={styles.content}>{post.content}</Text>

        {/* --- BOOK TAGGING CARD --- */}
        {post.book && (
          <TouchableOpacity style={styles.bookCard}>
            <Image source={{ uri: post.book.coverUrl }} style={styles.bookCover} />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={1}>{post.book.title}</Text>
              <Text style={styles.bookAuthor}>{post.book.author}</Text>
              <View style={styles.ratingBadge}>
                 <Icon name="star" size={10} color="#FFD700" />
                 <Text style={styles.ratingText}>4.5</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Ảnh bài đăng (nếu có) - Hiển thị dạng Grid hoặc Slide */}
        {post.images && post.images.length > 0 && (
          <View style={styles.imageContainer}>
             {/* Demo hiển thị 1 ảnh đầu tiên scroll ngang */}
             <Image source={{ uri: post.images[0] }} style={styles.postImage} />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="heart" size={20} color={COLORS.text} />
            <Text style={styles.actionText}>{post.likesCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="message-circle" size={20} color={COLORS.text} />
            <Text style={styles.actionText}>{post.commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="repeat" size={20} color={COLORS.text} />
            <Text style={styles.actionText}>{post.repostsCount}</Text>
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