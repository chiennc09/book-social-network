import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { Review } from '../../services/book.service';
import { UserAvatar } from '../common/UserAvatar';
import { RankBadge } from '../common/RankBadge';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  reviews: Review[];
  ratingAverage: number;
}

const ReviewsSection = ({ reviews, ratingAverage }: Props) => {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: isDarkMode ? '#181818' : '#F0F0F0' }]}>
      {/* Header Section */}
      <View style={styles.header}>
         <View style={{ flex: 1 }}>
             <Text style={[styles.title, { color: colors.text }]}>ĐÁNH GIÁ CỘNG ĐỒNG</Text>
             <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Dựa trên {reviews.length} đánh giá nổi bật</Text>
         </View>
         <View style={[styles.bigRatingBox, { backgroundColor: colors.card }]}>
             <Text style={[styles.bigRating, { color: colors.text }]}>{ratingAverage}</Text>
             <Icon name="star" size={16} color="#FFD700" />
         </View>
      </View>

      {/* Reviews List */}
      <View style={styles.list}>
        {reviews.map((review) => (
            <View key={review.id} style={[styles.item, { borderBottomColor: colors.border }]}>
                {/* User Info */}
                <View style={styles.userRow}>
                    <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: review.user.id })}>
                        <UserAvatar url={review.user.avatar} size={36} />
                    </TouchableOpacity>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: review.user.id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.name, { color: colors.text }]}>{review.user.displayName}</Text>
                            {review.user.badges && review.user.badges.length > 0 && (
                                <RankBadge 
                                    badge={review.user.badges[0]} 
                                    showGlow={false} 
                                    style={{ marginLeft: 6, paddingVertical: 1, paddingHorizontal: 5 }} 
                                />
                            )}
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                           <View style={{ flexDirection: 'row', marginRight: 8 }}>
                              {[1,2,3,4,5].map(s => (
                                  <Icon key={s} name="star" size={10} color={s <= review.rating ? '#FFD700' : (isDarkMode ? '#444' : '#E0E0E0')} />
                              ))}
                           </View>
                           <Text style={[styles.date, { color: colors.textSecondary }]}>{review.date}</Text>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <Text style={[styles.content, { color: colors.text }]}>{review.content}</Text>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Icon name="thumbs-up" size={14} color={colors.textSecondary} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>Hữu ích ({review.likes})</Text>
                    </TouchableOpacity>
                    <Text style={{color: isDarkMode ? '#444' : '#E0E0E0'}}>|</Text>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>Trả lời</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ))}
      </View>

      {/* Button Xem tất cả */}
      <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color: colors.text }]}>Xem tất cả đánh giá</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.m, marginTop: 10, borderTopWidth: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  subTitle: { fontSize: 12, marginTop: 4 },
  
  bigRatingBox: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bigRating: { fontWeight: 'bold', fontSize: 18 },

  list: { gap: 20 },
  item: { paddingBottom: 20, borderBottomWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  name: { fontWeight: 'bold', fontSize: 14 },
  date: { fontSize: 11 },
  content: { fontSize: 14, lineHeight: 22 },
  
  actions: { flexDirection: 'row', marginTop: 10, gap: 12, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '500' },

  viewAllBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 0 },
  viewAllText: { fontWeight: '600' },
  reviewBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 6 },
  feedBadgeIcon: { width: 10, height: 10, marginRight: 2 },
});

export default ReviewsSection;