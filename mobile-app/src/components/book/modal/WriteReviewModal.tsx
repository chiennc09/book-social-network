import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialRating: number;
  onSubmit: (rating: number, text: string) => void;
}

const WriteReviewModal = ({ visible, onClose, initialRating, onSubmit }: Props) => {
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState('');
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, justifyContent: 'flex-end'}}>
            <View style={[styles.container, { backgroundColor: colors.card }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Hủy</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Viết đánh giá</Text>
                    <TouchableOpacity onPress={() => { onSubmit(rating, text); onClose(); setText(''); }} disabled={text.length === 0}>
                        <Text style={[styles.submitText, { color: colors.primary, opacity: text.length > 0 ? 1 : 0.5 }]}>Đăng</Text>
                    </TouchableOpacity>
                </View>

                {/* Rating Input */}
                <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)} style={{padding: 8}}>
                            <Icon name="star" size={32} color={star <= rating ? '#FFD700' : (isDarkMode ? '#444' : '#D3D3D3')} />
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Chạm để xếp hạng</Text>

                {/* Text Input */}
                <TextInput 
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    placeholder="Hãy chia sẻ cảm nghĩ của bạn về cuốn sách này..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={text}
                    onChangeText={setText}
                    autoFocus
                />
            </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, height: '80%' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cancelText: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: 'bold' },
  submitText: { fontSize: 16, fontWeight: 'bold' },

  ratingRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  hint: { textAlign: 'center', fontSize: 12, marginBottom: 24 },

  input: { 
      borderRadius: 12, 
      padding: 16, fontSize: 16, height: 200, textAlignVertical: 'top' 
  },
});

export default WriteReviewModal;