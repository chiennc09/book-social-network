import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { COLORS, SPACING } from '../../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.handle} />
          <Text style={styles.title}>Thêm vào tủ sách</Text>
          <Text style={styles.subtitle}>Chọn trạng thái cho cuốn sách này</Text>

          <View style={styles.list}>
            {SHELVES.map((item) => {
              const isSelected = currentStatus === item.id;
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.item, isSelected && styles.activeItem]}
                  onPress={() => onSelect(item.id)}
                >
                  <View style={[styles.iconBox, { backgroundColor: isSelected ? item.color : '#333' }]}>
                    <Icon name={item.icon} size={24} color="white" />
                  </View>
                  <View style={styles.itemInfo}>
                     <Text style={[styles.itemLabel, isSelected && { color: item.color }]}>{item.label}</Text>
                     {isSelected && <Text style={styles.itemSub}>Trạng thái hiện tại</Text>}
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
  container: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, paddingBottom: 40 },
  handle: { width: 40, height: 5, backgroundColor: '#444', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  
  list: { gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#252525', borderWidth: 1, borderColor: '#333' },
  activeItem: { borderColor: '#555', backgroundColor: '#2A2A2A' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemLabel: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  itemSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});

export default ShelfModal;