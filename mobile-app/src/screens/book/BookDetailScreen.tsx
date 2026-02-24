import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, StatusBar, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import { bookService, BookDetail } from '../../services/book.service';

// Import Components
import StickyHeader from '../../components/book/StickyHeader';
import BookCoverSection from '../../components/book/BookCoverSection';
import ActionButtons from '../../components/book/ActionButtons'; // Đã có file mới
import DescriptionSection from '../../components/book/DescriptionSection';
import ReviewsSection from '../../components/book/ReviewsSection'; // Đã có file mới

// Import Modals
import ShelfModal from '../../components/book/modal/ShelfModal';
import DetailInfoModal from '../../components/book/modal/DetailInfoModal';
import WriteReviewModal from '../../components/book/modal/WriteReviewModal'; // Đã có file mới

import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

const BookDetailScreen = ({ route, navigation }: any) => {
  const { bookId } = route.params || {};
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Lấy token để load ảnh/file nếu backend yêu cầu Auth
  const { token } = useSelector((state: RootState) => state.auth);

  // Modals Visibility
  const [shelfModalVisible, setShelfModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  
  // User Interaction State
  const [userRating, setUserRating] = useState(0); // 0 means not rated yet

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetch = async () => {
      if (!bookId) return;
      try {
        const data = await bookService.getBookDetails(bookId);
        setBook(data);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết sách", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [bookId]);

  if (loading || !book) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.text} />
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* 1. Header Sticky */}
      <StickyHeader scrollY={scrollY} title={book.title} onBack={() => navigation.goBack()} />

      <Animated.ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* 2. Ảnh bìa (Đã update tràn viền) */}
        <BookCoverSection book={book} accessToken={token || ''} />

        {/* 3. Nút hành động (Shelf, Rate, Detail, Share, Read) */}
        <ActionButtons 
            currentStatus={book.status || 'none'}
            userRating={userRating}
            progressPercent={book.progressPercent || book.progress || 0}
            totalPages={book.totalPages || book.totalPage || 0}
            onPressShelf={() => setShelfModalVisible(true)}
            onPressDetail={() => setDetailModalVisible(true)}
            onPressShare={() => console.log('Share')}
            onPressRead={() => {
                // Kiểm tra loại file và chuyển hướng sang màn hình đọc (nếu có)
                if (book.epubPath || book.pdfPath) {
                    const url = book.epubPath || book.pdfPath;
                    navigation.navigate('Reader', { bookId: book.id, url, lastPosition: book.lastPosition });
                } else {
                    console.log('Sách này chưa có file để đọc.');
                }
            }}
            onRate={(star) => {
                setUserRating(star);
                setReviewModalVisible(true); // Bật modal viết review ngay
            }}
        />

        {/* 4. Mô tả */}
        <DescriptionSection description={book.description} />

        {/* 5. Đánh giá (Đã có component) */}
        <ReviewsSection reviews={book.reviews} ratingAverage={book.ratingAverage} />

      </Animated.ScrollView>

      {/* --- MODALS --- */}
      
      {/* Modal Chọn Kệ */}
      <ShelfModal 
        visible={shelfModalVisible} 
        onClose={() => setShelfModalVisible(false)}
        currentStatus={book.status || 'none'}
        onSelect={async (status) => {
            // Check if user is re-selecting the exact same status
            if (book.status === status) {
                 setShelfModalVisible(false);
                 return;
            }
            try {
                // Call actual API mapping Frontend strings to Backend Enums 
                // Assumes ReadStatus Enum structure in backend is UpperCase ('READING', 'READ', 'WANT_TO_READ')
                const backendStatus = status.toUpperCase() as any; 
                import('../../api/bookApi').then(api => {
                    api.bookApi.updateShelf(book.id, backendStatus)
                       .then(() => {
                           // Cập nhật lại state local xem như lưu thành công
                           setBook({ ...book, status: status as any });
                           setShelfModalVisible(false);
                       })
                       .catch(err => {
                           console.error("Lỗi khi thêm vào kệ", err);
                           setShelfModalVisible(false); // Hide modal anyway, maybe show toast in future
                       });
                });
            } catch (err) {
                console.error("Unknown API call error", err);
            }
        }}
      />

      {/* Modal Thông tin chi tiết */}
      <DetailInfoModal 
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        book={book}
      />

      {/* Modal Viết Review */}
      <WriteReviewModal 
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        initialRating={userRating}
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
});

export default BookDetailScreen;