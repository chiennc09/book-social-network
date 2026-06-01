import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../../../constants/theme';
import { BookDetail } from '../../../services/book.service';
import { useTheme } from '../../../context/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  book: BookDetail;
}

const DetailInfoModal = ({ visible, onClose, book }: Props) => {
  const { colors, isDarkMode } = useTheme();

  const Row = ({ label, value }: { label: string, value: string | number }) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: isDarkMode ? '#252525' : '#F5F5F5' }]}>
            <Text style={[styles.title, { color: colors.text }]}>Thông tin phát hành</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeText, { color: colors.primary }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <Row label="Nhà xuất bản" value={book.publisher} />
            <Row label="Ngày xuất bản" value={book.publishDate} />
            <Row label="Ngôn ngữ" value={book.language} />
            <Row label="Số trang" value={book.pages} />
            <Row label="ISBN" value={book.isbn} />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.l },
  container: { borderRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.m, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  closeText: { fontWeight: 'bold' },
  content: { padding: SPACING.m },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 15 },
  value: { fontWeight: '500', fontSize: 15, maxWidth: '60%', textAlign: 'right' },
});

export default DetailInfoModal;