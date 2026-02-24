import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useWindowDimensions } from 'react-native';

// Import các Screen
import HomeScreen from '../screens/home/HomeScreen'; // Bạn cần tạo file này (placeholder)
import ProfileScreen from '../screens/profile/ProfileScreen';
import HomeDrawerContent from '../components/drawers/HomeDrawerContent';
import SettingsDrawerContent from '../components/drawers/SettingsDrawerContent';

const Drawer = createDrawerNavigator();

// 1. HOME DRAWER (Menu bên Trái - Left)
export const HomeDrawerNavigator = () => {
  const dimensions = useWindowDimensions();
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <HomeDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide', // Hiệu ứng đẩy màn hình
        drawerPosition: 'left', // Nằm bên trái
        drawerStyle: { width: dimensions.width * 0.75 }, // Chiếm 75% màn hình như ảnh
        swipeEdgeWidth: 100, // Vùng vuốt rộng hơn để dễ thao tác
      }}
    >
      <Drawer.Screen name="HomeFeed" component={HomeScreen} />
    </Drawer.Navigator>
  );
};

// 2. PROFILE DRAWER (Menu bên Phải - Right)
export const ProfileDrawerNavigator = () => {
  const dimensions = useWindowDimensions();

  return (
    <Drawer.Navigator
      id="ProfileDrawer" // Định danh để gọi openDrawer đúng chỗ
      drawerContent={(props) => <SettingsDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerPosition: 'right', // Nằm bên phải (Ngược với ảnh 1 theo yêu cầu)
        drawerStyle: { width: dimensions.width * 0.8 },
        swipeEnabled: true, // Cho phép vuốt
      }}
    >
      <Drawer.Screen name="UserProfile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
};