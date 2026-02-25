import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { appService } from '../../services/app.service';

const HomeDrawerContent = ({ navigation }: any) => {
  const [filters, setFilters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('foryou');

  useEffect(() => {
    const fetchFilters = async () => {
      const data: any = await appService.getFeedFilters();
      setFilters(data);
      setLoading(false);
    };
    fetchFilters();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bảng Feed</Text>
        <TouchableOpacity onPress={() => navigation.closeDrawer()}>
           <Icon name="x" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.text} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.list}>
          {filters.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.item, activeId === item.id && styles.activeItem]}
              onPress={() => {
                setActiveId(item.id);
                navigation.navigate('HomeFeed', { filter: item.id });
                // Đợi navigate rồi mới close cho mượt
                setTimeout(() => navigation.closeDrawer(), 100);
              }}
            >
              <Text style={[styles.itemText, activeId === item.id && styles.activeText]}>
                {item.label}
              </Text>
              {activeId === item.id && <Icon name="check" size={18} color={COLORS.text} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818', padding: SPACING.m }, // Màu nền hơi xám giống ảnh
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l, paddingHorizontal: SPACING.s },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
  list: { gap: 10 },
  item: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.m, borderRadius: 12, borderWidth: 1, borderColor: '#333', backgroundColor: '#000' 
  },
  activeItem: { borderColor: COLORS.text },
  itemText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  activeText: { color: COLORS.text },
});

export default HomeDrawerContent;