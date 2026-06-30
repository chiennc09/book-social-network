import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { COLORS, SPACING } from '../../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../../context/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentStatus: string;
  onSelect: (status: string) => void;
}

const SHELVES = [
  { id: 'want_to_read', label: 'Muốn đọc', icon: 'bookmark', color: '#3498db' },
  { id: 'reading', label: 'Đang đọc', icon: 'book-open', color: '#f1c40f' },
  { id: 'read', label: 'Đã đọc', icon: 'check-circle', color: '#2ecc71' },
];

const ShelfModal = ({ visible, onClose, currentStatus, onSelect }: Props) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Thêm vào tủ sách</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Chọn trạng thái cho cuốn sách này</Text>

          <View style={styles.list}>
            {SHELVES.map((item) => {
              const isSelected = currentStatus?.toLowerCase() === item.id.toLowerCase();
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[
                    styles.item, 
                    { 
                      backgroundColor: isDarkMode ? '#252525' : '#F7F7F7', 
                      borderColor: colors.border 
                    },
                    isSelected && {
                      borderColor: isDarkMode ? '#555' : '#CCC', 
                      backgroundColor: isDarkMode ? '#2A2A2A' : '#EDEDED'
                    }
                  ]}
                  onPress={() => onSelect(item.id)}
                >
                  <View style={[styles.iconBox, { backgroundColor: isSelected ? item.color : (isDarkMode ? '#333' : '#E0E0E0') }]}>
                    <Icon name={item.icon} size={24} color={isSelected ? 'white' : (isDarkMode ? '#AAA' : '#555')} />
                  </View>
                  <View style={styles.itemInfo}>
                     <Text style={[styles.itemLabel, { color: colors.text }, isSelected && { color: item.color }]}>{item.label}</Text>
                     {isSelected && <Text style={[styles.itemSub, { color: colors.textSecondary }]}>Trạng thái hiện tại</Text>}
                  </View>
                  {isSelected && <Icon name="check" size={24} color={item.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, paddingBottom: 40 },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  
  list: { gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemLabel: { fontSize: 16, fontWeight: 'bold' },
  itemSub: { fontSize: 12, marginTop: 2 },
});

export default ShelfModal;