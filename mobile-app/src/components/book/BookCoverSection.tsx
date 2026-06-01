import React from 'react';
import { View, Text, Image, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BookDetail } from '../../services/book.service';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface Props {
  book: BookDetail;
  accessToken?: string;
}

const BookCoverSection = ({ book, accessToken }: Props) => {
  const imageSource = accessToken 
      ? { uri: book.coverUrl, headers: { Authorization: `Bearer ${accessToken}` } }
      : { uri: book.coverUrl };

  return (
    <View style={styles.container}>
      {/* LỚP NỀN: Ảnh bìa phóng to + Blur cực mạnh để tạo màu chủ đạo */}
      <View style={styles.backgroundContainer}>
          <ImageBackground 
            source={imageSource} 
            style={styles.blurBackground}
            blurRadius={30} // Blur mạnh để lấy tông màu
            resizeMode="cover"
            onError={(e) => console.log('ImageBackground Load Error:', e.nativeEvent.error)}
          >
            {/* Lớp phủ đen mờ nhẹ để text vẫn đọc được trên nền màu */}
            <View style={styles.overlay} />
          </ImageBackground>
      </View>

      {/* NỘI DUNG CHÍNH (Nổi lên trên) */}
      <View style={styles.content}>
        <Image 
           source={imageSource} 
           style={styles.coverImage} 
           onError={(e) => console.log('Image Load Error:', e.nativeEvent.error)}
        />
        
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>by {book.author}</Text>

        <View style={styles.ratingContainer}>
            <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                   <Icon key={s} name="star" size={14} color={s <= Math.round(book.ratingAverage) ? '#FFD700' : '#BBB'} />
                ))}
            </View>
            <Text style={styles.ratingText}>
                {book.ratingAverage} • {book.ratingCount} đánh giá • {book.totalViews || 0} lượt xem
            </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 10 },
  
  // Container này sẽ chứa ảnh nền tràn viền
  backgroundContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden', // Cắt bớt phần thừa nếu cần
  },
  blurBackground: { 
    width: width, 
    height: width * 1.2, // Cao hơn chiều rộng để phủ xuống dưới
    opacity: 0.6 // Giảm độ đậm để không quá chói
  },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.3)' // Phủ tối 30%
  },
  
  content: { alignItems: 'center', paddingTop: 100, paddingBottom: 20 }, // PaddingTop để tránh Header
  coverImage: { 
    width: 150, height: 230, borderRadius: 12, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 15 
  },
  
  title: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 16, paddingHorizontal: 20, fontFamily: 'serif' },
  author: { color: '#EEE', fontSize: 16, marginTop: 4, fontWeight: '500' },
  
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stars: { flexDirection: 'row', gap: 2, marginRight: 8 },
  ratingText: { color: 'white', fontSize: 13, fontWeight: '600' },
});

export default BookCoverSection;