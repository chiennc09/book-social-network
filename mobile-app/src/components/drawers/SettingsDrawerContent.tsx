import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch } from 'react-redux';
import { COLORS, SPACING } from '../../constants/theme';
import { appService } from '../../services/app.service';
import { userService } from '../../services/user.service';
import { logoutUser } from '../../redux/authSlice';
import { AppDispatch } from '../../redux/store';

const SettingsDrawerContent = ({ navigation }: any) => {
  // Logic lấy menu và user profile được đặt ở đây là hợp lý vì:
  // 1. Đây là Component "Container" (thông minh), chịu trách nhiệm data cho Drawer này.
  // 2. Tách biệt khỏi Screen chính giúp code gọn gàng hơn.
  // 3. Nếu muốn tái sử dụng ở nhiều nơi, có thể tách logic fetch ra custom hook riêng (vd: useDrawerData).
  const [menu, setMenu] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Hàm lấy dữ liệu menu và profile
    const fetchData = async () => {
      const [menuData, userData]: any = await Promise.all([
        appService.getSettingsMenu(),
        userService.getProfile()
      ]);
      setMenu(menuData);
      setUser(userData);
    };
    fetchData();
  }, []);

  const handleItemPress = (item: any) => {
    if (item.id === 'logout') {
      // Close the drawer first, then logout so navigation resets cleanly
      navigation.closeDrawer?.();
      setTimeout(() => dispatch(logoutUser()), 120);
    } else {
      console.log('Pressed:', item.label);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Profile Mini */}
      {user && (
        <View style={styles.profileHeader}>
           <Image source={{ uri: user.avatar }} style={styles.avatar} />
           <View>
             <Text style={styles.displayName}>{user.displayName}</Text>
             <Text style={styles.username}>{user.username}</Text>
           </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.list}>
        {menu.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.item}
            onPress={() => handleItemPress(item)}
          >
            <Icon name={item.icon} size={22} color={item.danger ? COLORS.danger : COLORS.text} />
            <Text style={[styles.itemText, item.danger && { color: COLORS.danger }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: { padding: SPACING.m, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  displayName: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  username: { color: COLORS.textSecondary, fontSize: 14 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: SPACING.s },
  list: { padding: SPACING.m },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
  itemText: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
});

export default SettingsDrawerContent;