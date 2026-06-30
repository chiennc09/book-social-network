import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch } from 'react-redux';
import { COLORS, SPACING } from '../../constants/theme';
import { appService } from '../../services/app.service';
import { userService } from '../../services/user.service';
import { profileApi } from '../../api/profileApi';
import { logoutUser } from '../../redux/authSlice';
import { AppDispatch } from '../../redux/store';
import { useTheme } from '../../context/ThemeContext';

const SettingsDrawerContent = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const dispatch = useDispatch<AppDispatch>();
  const { themeMode, setThemeMode, colors, isDarkMode } = useTheme();

  const cycleTheme = () => {
    if (themeMode === 'dark') {
      setThemeMode('light');
    } else {
      setThemeMode('dark');
    }
  };

  const getThemeLabel = () => {
    return themeMode === 'light' ? 'Sáng' : 'Tối';
  };

  const getThemeIcon = () => {
    return themeMode === 'light' ? 'sun' : 'moon';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuData, userData, incomingRequests]: any = await Promise.all([
          appService.getSettingsMenu(),
          userService.getProfile(),
          profileApi.getIncomingRequests()
        ]);
        setMenu(menuData);
        setUser(userData);
        const incomingList = incomingRequests?.result || incomingRequests?.data?.result || incomingRequests?.data || [];
        setPendingCount(incomingList.length);
      } catch (e) {
        console.error('Failed to fetch settings drawer data', e);
      }
    };

    // Auto-refresh when the drawer opens / receives focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    fetchData();
    return unsubscribe;
  }, [navigation]);

  const handleItemPress = (item: any) => {
    if (item.id === 'logout') {
      navigation.closeDrawer?.();
      setTimeout(() => dispatch(logoutUser()), 120);
    } else if (item.id === 'friends') {
      navigation.closeDrawer?.();
      navigation.navigate('FriendManagement');
    } else {
      console.log('Pressed:', item.label);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      {/* Header Profile Mini */}
      {user && (
        <View style={styles.profileHeader}>
           <Image source={{ uri: user.avatar }} style={styles.avatar} />
           <View>
             <Text style={[styles.displayName, { color: colors.text }]}>{user.displayName}</Text>
             <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
           </View>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.list}>
        {menu.map((item) => {
          const isLogout = item.id === 'logout';
          return (
            <React.Fragment key={item.id}>
              {isLogout && (
                <TouchableOpacity 
                  style={styles.item}
                  onPress={cycleTheme}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}>
                    <Icon name={getThemeIcon()} size={22} color={colors.text} />
                    <Text style={[styles.itemText, { color: colors.text }]}>Giao diện: {getThemeLabel()}</Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.item}
                onPress={() => handleItemPress(item)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}>
                  <Icon name={item.icon} size={22} color={item.danger ? colors.danger : colors.text} />
                  <Text style={[styles.itemText, { color: colors.text }, item.danger && { color: colors.danger }]}>{item.label}</Text>
                </View>
                {item.id === 'friends' && pendingCount > 0 && (
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: { padding: SPACING.m, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333' },
  displayName: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  username: { color: COLORS.textSecondary, fontSize: 14 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: SPACING.s },
  list: { padding: SPACING.m },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
  itemText: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
  badgeCount: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default SettingsDrawerContent;