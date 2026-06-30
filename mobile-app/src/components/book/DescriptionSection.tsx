import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const DescriptionSection = ({ description }: { description: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.header, { color: colors.text }]}>MÔ TẢ</Text>
      <Text 
        style={[styles.text, { color: colors.textSecondary }]} 
        numberOfLines={isExpanded ? undefined : 4} // Nếu chưa mở rộng thì chỉ hiện 4 dòng
      >
        {description}
      </Text>
      
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.btn}>
        <Text style={styles.btnText}>
          {isExpanded ? 'Thu gọn' : 'Xem tất cả'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { padding: SPACING.m, marginTop: 10 },
  header: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8, letterSpacing: 1 },
  text: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 24 },
  btn: { alignSelf: 'flex-start', marginTop: 6 },
  btnText: { color: '#2E8B57', fontWeight: 'bold', fontSize: 14 },
});

export default DescriptionSection;