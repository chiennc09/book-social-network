import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';

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
}

const ActionButtons = ({ currentStatus, onPressShelf, onPressDetail, onPressShare, onRate, userRating, onPressRead, progressPercent = 0, totalPages = 0 }: Props) => {
  
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
      
      {/* 1. Main Button: Chọn Kệ Sách (bên cạnh Nút Đọc sách) */}
      <View style={{flexDirection: 'row', gap: 10, width: '100%'}}>
          <TouchableOpacity style={styles.mainBtn} onPress={onPressShelf}>
             <Text style={styles.mainBtnText}>{getStatusLabel(currentStatus)}</Text>
             <View style={styles.divider} />
             <Icon name="chevron-down" size={20} color="white" />
          </TouchableOpacity>
          {/* Nút Đọc sách kề bên */}
          <TouchableOpacity style={styles.readBtnSmall} onPress={onPressRead}>
             <Icon name="book-open" size={20} color="white" />
          </TouchableOpacity>
      </View>

      {/* 2. Rating Area: Chấm điểm */}
      <View style={styles.ratingArea}>
         <Text style={styles.ratingLabel}>Đánh giá của bạn:</Text>
         <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => onRate(star)} style={{padding: 4}}>
                    <Icon 
                        name="star" 
                        size={28} 
                        color={star <= userRating ? '#FFD700' : '#444'} // Vàng nếu đã chọn, Xám nếu chưa
                    />
                </TouchableOpacity>
            ))}
         </View>
         {/* Nếu đã rate thì hiện nút viết review */}
         {userRating > 0 && (
             <TouchableOpacity onPress={() => onRate(userRating)} style={{ marginTop: 5 }}>
                 <Text style={styles.writeReviewText}>Viết cảm nhận</Text>
             </TouchableOpacity>
         )}
      </View>

      {/* 3. Utils Buttons: Chi tiết & Share */}
      <View style={styles.utilsRow}>
         <TouchableOpacity style={styles.utilBtn} onPress={onPressDetail}>
            <Icon name="info" size={18} color={COLORS.text} />
            <Text style={styles.utilBtnText}>Chi tiết</Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.utilBtn} onPress={onPressShare}>
            <Icon name="share-2" size={18} color={COLORS.text} />
            <Text style={styles.utilBtnText}>Chia sẻ</Text>
         </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACING.m, marginTop: 10 },
  
  // Main Button Area
  mainBtn: { 
    flex: 1,
    backgroundColor: '#2E8B57', height: 50, borderRadius: 12, 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    shadowColor: "#2E8B57", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },
  mainBtnText: { flex: 1, color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
  
  // Small Read Button
  readBtnSmall: {
    backgroundColor: COLORS.primary, height: 50, width: 50, borderRadius: 12, 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },

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
