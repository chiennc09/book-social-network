import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../../../constants/theme';
import { BookDetail } from '../../../services/book.service';

interface Props {
  visible: boolean;
  onClose: () => void;
  book: BookDetail;
}

const DetailInfoModal = ({ visible, onClose, book }: Props) => {
  const Row = ({ label, value }: { label: string, value: string | number }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Thông tin phát hành</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>Đóng</Text>
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
  container: { backgroundColor: '#1E1E1E', borderRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#333', backgroundColor: '#252525' },
  title: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  closeText: { color: '#2E8B57', fontWeight: 'bold' },
  content: { padding: SPACING.m },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  label: { color: COLORS.textSecondary, fontSize: 15 },
  value: { color: COLORS.text, fontWeight: '500', fontSize: 15, maxWidth: '60%', textAlign: 'right' },
});

export default DetailInfoModal;