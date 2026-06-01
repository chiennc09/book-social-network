import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { appService } from '../../services/app.service';
import { useTheme } from '../../context/ThemeContext';

const HomeDrawerContent = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('foryou');
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    const fetchFilters = async () => {
      const data: any = await appService.getFeedFilters();
      setFilters(data);
      setLoading(false);
    };
    fetchFilters();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Bảng Feed</Text>
        <TouchableOpacity onPress={() => navigation.closeDrawer()}>
           <Icon name="x" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.list}>
          {filters.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.item, 
                { 
                  borderColor: colors.border, 
                  backgroundColor: colors.card 
                }, 
                activeId === item.id && { borderColor: colors.text }
              ]}
              onPress={() => {
                setActiveId(item.id);
                navigation.navigate('HomeFeed', { filter: item.id });
                // Đợi navigate rồi mới close cho mượt
                setTimeout(() => navigation.closeDrawer(), 100);
              }}
            >
              <Text style={[styles.itemText, { color: colors.textSecondary }, activeId === item.id && { color: colors.text }]}>
                {item.label}
              </Text>
              {activeId === item.id && <Icon name="check" size={18} color={colors.text} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.m },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l, paddingHorizontal: SPACING.s },
  title: { fontSize: 22, fontWeight: 'bold' },
  list: { gap: 10 },
  item: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.m, borderRadius: 12, borderWidth: 1
  },
  itemText: { fontSize: 16, fontWeight: '600' },
});

export default HomeDrawerContent;