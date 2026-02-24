import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { Review } from '../../services/book.service';

interface Props {
  reviews: Review[];
  ratingAverage: number;
}

const ReviewsSection = ({ reviews, ratingAverage }: Props) => {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
         <View>
             <Text style={styles.title}>ĐÁNH GIÁ CỘNG ĐỒNG</Text>
             <Text style={styles.subTitle}>Dựa trên {reviews.length} đánh giá nổi bật</Text>
         </View>
         <View style={styles.bigRatingBox}>
             <Text style={styles.bigRating}>{ratingAverage}</Text>
             <Icon name="star" size={16} color="#FFD700" />
         </View>
      </View>

      {/* Reviews List */}
      <View style={styles.list}>
        {reviews.map((review) => (
            <View key={review.id} style={styles.item}>
                {/* User Info */}
                <View style={styles.userRow}>
                    <Image source={{ uri: review.user.avatar }} style={styles.avatar} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.name}>{review.user.displayName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                           <View style={{ flexDirection: 'row', marginRight: 8 }}>
                              {[1,2,3,4,5].map(s => (
                                  <Icon key={s} name="star" size={10} color={s <= review.rating ? '#FFD700' : '#444'} />
                              ))}
                           </View>
                           <Text style={styles.date}>{review.date}</Text>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <Text style={styles.content}>{review.content}</Text>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Icon name="thumbs-up" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.actionText}>Hữu ích ({review.likes})</Text>
                    </TouchableOpacity>
                    <Text style={{color: '#444'}}>|</Text>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionText}>Trả lời</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ))}
      </View>

      {/* Button Xem tất cả */}
      <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>Xem tất cả đánh giá</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.m, marginTop: 10, borderTopWidth: 8, borderTopColor: '#181818' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  subTitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  
  bigRatingBox: { alignItems: 'center', backgroundColor: '#252525', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bigRating: { color: COLORS.text, fontWeight: 'bold', fontSize: 18 },

  list: { gap: 20 },
  item: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  name: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  date: { color: COLORS.textSecondary, fontSize: 11 },
  content: { color: '#DDD', fontSize: 14, lineHeight: 22 },
  
  actions: { flexDirection: 'row', marginTop: 10, gap: 12, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },

  viewAllBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 0 },
  viewAllText: { color: COLORS.text, fontWeight: '600' }
});

export default ReviewsSection;