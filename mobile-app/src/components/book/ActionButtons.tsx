import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  currentStatus: string;
  onPressShelf: () => void;
  onPressDetail: () => void;
  onPressShare: () => void;
  onRate: (star: number) => void;
  userRating: number; // Điểm người dùng đã chấm (0 nếu chưa)
  onPressRead?: () => void;
  progressPercent?: number;
  totalPages?: number;
  isFavorited?: boolean;
  totalFavorites?: number;
  onToggleFavorite?: () => void;
}

const ActionButtons = ({ 
  currentStatus, onPressShelf, onPressDetail, onPressShare, onRate, userRating, 
  onPressRead, progressPercent = 0, totalPages = 0,
  isFavorited = false, totalFavorites = 0, onToggleFavorite 
}: Props) => {
  const { colors, isDarkMode } = useTheme();
  
  // Map trạng thái sang Label tiếng Việt
  const getStatusLabel = (status: string) => {
    switch(status) {
        case 'READING': 
        case 'reading': return 'Đang đọc';
        case 'READ': 
        case 'read': return 'Đã đọc';
        case 'WANT_TO_READ': 
        case 'want_to_read': return 'Muốn đọc';
        default: return 'Thêm vào Tủ sách';
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 1. Main Button: Chọn Kệ Sách (bên cạnh Nút Đọc sách & Yêu thích) */}
      <View style={{flexDirection: 'row', gap: 8, width: '100%', alignItems: 'center'}}>
          <TouchableOpacity style={styles.mainBtn} onPress={onPressShelf}>
             <Text style={styles.mainBtnText} numberOfLines={1} adjustsFontSizeToFit>{getStatusLabel(currentStatus)}</Text>
             <View style={styles.divider} />
             <Icon name="chevron-down" size={16} color="white" />
          </TouchableOpacity>

          {/* Nút Đọc sách To Đẹp Hài Hòa */}
          <TouchableOpacity 
             style={[styles.readBtnLarge, { backgroundColor: colors.primary }]} 
             onPress={onPressRead}
          >
             <Icon name="book-open" size={18} color={isDarkMode ? '#000000' : '#FFFFFF'} style={{ marginRight: 6 }} />
             <Text style={[styles.readBtnText, { color: isDarkMode ? '#000000' : '#FFFFFF' }]} numberOfLines={1} adjustsFontSizeToFit>Đọc sách</Text>
          </TouchableOpacity>

          {/* Nút Yêu thích (Tym) */}
          <TouchableOpacity 
             style={[
               styles.favBtn, 
               { 
                 backgroundColor: isFavorited ? '#ff4757' : colors.card, 
                 borderColor: isFavorited ? '#ff4757' : colors.border, 
                 borderWidth: 1 
               }
             ]} 
             onPress={onToggleFavorite}
          >
             <Icon name="heart" size={18} color={isFavorited ? 'white' : colors.text} />
             {totalFavorites > 0 ? (
                <Text style={[styles.favCount, { color: isFavorited ? 'white' : colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{totalFavorites}</Text>
             ) : null}
          </TouchableOpacity>
      </View>

      {/* 2. Rating Area: Chấm điểm */}
      <View style={styles.ratingArea}>
         <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Đánh giá của bạn:</Text>
         <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => onRate(star)} style={{padding: 4}}>
                    <Icon 
                        name="star" 
                        size={28} 
                        color={star <= userRating ? '#FFD700' : (isDarkMode ? '#444' : '#E0E0E0')} // Vàng nếu đã chọn, Xám nếu chưa
                    />
                </TouchableOpacity>
            ))}
         </View>
         {/* Nếu đã rate thì hiện nút viết review */}
         {userRating > 0 && (
             <TouchableOpacity onPress={() => onRate(userRating)} style={{ marginTop: 5 }}>
                 <Text style={[styles.writeReviewText, { color: colors.text }]}>Viết cảm nhận</Text>
             </TouchableOpacity>
         )}
      </View>

      {/* 3. Utils Buttons: Chi tiết & Share */}
      <View style={styles.utilsRow}>
         <TouchableOpacity style={[styles.utilBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPressDetail}>
            <Icon name="info" size={18} color={colors.text} />
            <Text style={[styles.utilBtnText, { color: colors.text }]}>Chi tiết</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.utilBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPressShare}>
            <Icon name="share-2" size={18} color={colors.text} />
            <Text style={[styles.utilBtnText, { color: colors.text }]}>Chia sẻ</Text>
         </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACING.m, marginTop: 10 },
  
  // Main Button Area (Thêm vào tủ sách)
  mainBtn: { 
    flex: 1.2,
    backgroundColor: '#2E8B57', height: 50, borderRadius: 12, 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    shadowColor: "#2E8B57", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },
  mainBtnText: { flex: 1, color: 'white', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 6 },
  
  // Large Read Button (Đọc sách)
  readBtnLarge: {
    flex: 1,
    backgroundColor: '#FFFFFF', height: 50, borderRadius: 12, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10,
    shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5
  },
  readBtnText: { color: '#000000', fontWeight: 'bold', fontSize: 15 },

  // Favorite Button (Tym)
  favBtn: {
    backgroundColor: '#2A2A2A', height: 50, width: 50, borderRadius: 12, 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },
  favCount: { color: 'white', fontSize: 9, marginTop: 2, fontWeight: 'bold' },

  // Rating Area
  ratingArea: { alignItems: 'center', marginTop: 24 },
  ratingLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 8 },
  starRow: { flexDirection: 'row', gap: 8 },
  writeReviewText: { color: COLORS.text, textDecorationLine: 'underline', fontWeight: 'bold', fontSize: 14, marginTop: 4 },

  // Utils Row
  utilsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  utilBtn: { 
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
      gap: 8, paddingVertical: 12, borderRadius: 12, 
      backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' 
  },
  utilBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
});

export default ActionButtons;
