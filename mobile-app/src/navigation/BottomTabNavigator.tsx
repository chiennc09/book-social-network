import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../constants/theme';
import { HomeDrawerNavigator, ProfileDrawerNavigator } from './DrawerNavigators';
import LibraryScreen from '../screens/library/LibraryScreen';
import SearchScreen from '../screens/search/SearchScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabScrollBus } from '../utils/tabScrollBus';
import { useTheme } from '../context/ThemeContext';

export { tabScrollBus };   // re-export so screens only need to import from here

const Tab = createBottomTabNavigator();
export const TAB_BAR_HEIGHT = 60;

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { name: 'Home',       icon: 'home',           component: HomeDrawerNavigator },
  { name: 'Search',     icon: 'search',         component: SearchScreen },
  { name: 'Chatbot',    icon: 'message-circle', component: ChatListScreen },
  { name: 'Library',    icon: 'book',           component: LibraryScreen },
  { name: 'ProfileTab', icon: 'user',           component: ProfileDrawerNavigator },
] as const;

// ── Custom Animated Tab Bar ───────────────────────────────────────────────────
const AnimatedTabBar = ({ state, descriptors, navigation }: any) => {
  const insets      = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const totalHeight = TAB_BAR_HEIGHT + bottomInset;

  // 0 = visible, totalHeight = hidden below screen
  const translateY = useRef(new Animated.Value(0)).current;
  const isHidden   = useRef(false);

  const { colors, isDarkMode } = useTheme();

  const show = useCallback(() => {
    if (!isHidden.current) return;
    isHidden.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [translateY]);

  const hide = useCallback(() => {
    if (isHidden.current) return;
    isHidden.current = true;
    Animated.timing(translateY, {
      toValue: totalHeight,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [translateY, totalHeight]);

  // Subscribe to global scroll bus
  useEffect(() => {
    const unsub = tabScrollBus.subscribe(dir => {
      if (dir === 'down') hide();
      else show();
    });
    return unsub;
  }, [hide, show]);

  const tabBgColor = isDarkMode ? 'rgba(10,10,10,0.96)' : 'rgba(255,255,255,0.96)';
  const tabBorderColor = colors.border;
  const inactiveIconColor = isDarkMode ? '#525252' : '#8E8E93';
  const wrapActiveBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          height: totalHeight,
          paddingBottom: bottomInset,
          transform: [{ translateY }],
          backgroundColor: tabBgColor,
          borderTopColor: tabBorderColor,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused   = state.index === index;
        const tabDef      = TABS.find(t => t.name === route.name);
        const iconName    = tabDef?.icon ?? 'circle';

        const onPress = () => {
          show();   // always reveal bar on tap
          const event = navigation.emit({
            type: 'tabPress', target: route.key, canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () =>
          navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.75}
          >
            {/* Active indicator dot */}
            {isFocused && <View style={[styles.activeDot, { backgroundColor: colors.text }]} />}

            <View style={[styles.iconWrap, isFocused && { backgroundColor: wrapActiveBg }]}>
              <Icon
                name={iconName}
                size={24}
                color={isFocused ? colors.text : inactiveIconColor}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

// ── Navigator ─────────────────────────────────────────────────────────────────
const BottomTabNavigator = () => (
  <Tab.Navigator
    tabBar={props => <AnimatedTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    {TABS.map(tab => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component as any} />
    ))}
  </Tab.Navigator>
);

export default BottomTabNavigator;

// ── useTabBarScrollControl ────────────────────────────────────────────────────
// Drop-in hook — pass `onScroll` to any FlatList/ScrollView.
// The bar hides when user scrolls down ≥ threshold pixels, reveals on scroll up.
//
// Usage:
//   const { onScroll } = useTabBarScrollControl();
//   <FlatList onScroll={onScroll} scrollEventThrottle={16} ... />
//
export const useTabBarScrollControl = (threshold = 10) => {
  const lastY = useRef(0);

  const onScroll = useCallback((event: any) => {
    const y    = event.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;

    // Ignore tiny jitter
    if (Math.abs(diff) < threshold) return;

    tabScrollBus.emit(diff > 0 ? 'down' : 'up');
    lastY.current = y;
  }, [threshold]);

  return { onScroll };
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,10,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 10 },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.text,
  },
  iconWrap: {
    width: 46,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});