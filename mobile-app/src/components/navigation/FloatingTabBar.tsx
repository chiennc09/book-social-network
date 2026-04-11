/**
 * FloatingTabBar — animated bottom tab bar for non-modal screens.
 *
 * Behaviour matches BottomTabNavigator's AnimatedTabBar:
 *   - Subscribes to tabScrollBus; slides down on 'down', springs up on 'up'.
 *   - Uses pointerEvents="none" when fully hidden so it NEVER blocks touch events.
 *
 * Usage:
 *   <FloatingTabBar activeTab="Search" />   ← place at the BOTTOM of SafeAreaView
 *
 * ⚠️  Do NOT use this on modal screens (slide_from_bottom). Those already have a
 *    back gesture. Only add to screens with animation: 'slide_from_right'.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import Icon                from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS }          from '../../constants/theme';
import { useNavigation }   from '@react-navigation/native';
import { tabScrollBus }    from '../../utils/tabScrollBus';

type TabName = 'Home' | 'Search' | 'Chatbot' | 'Library' | 'ProfileTab';

interface Props {
  activeTab?: TabName;
}

const TABS: { name: TabName; icon: string }[] = [
  { name: 'Home',       icon: 'home'           },
  { name: 'Search',     icon: 'search'         },
  { name: 'Chatbot',    icon: 'message-circle' },
  { name: 'Library',    icon: 'book'           },
  { name: 'ProfileTab', icon: 'user'           },
];

const TAB_HEIGHT = 56;

const FloatingTabBar = ({ activeTab }: Props) => {
  const navigation   = useNavigation<any>();
  const insets       = useSafeAreaInsets();
  const bottomInset  = insets.bottom;
  const totalHeight  = TAB_HEIGHT + bottomInset;

  const translateY   = useRef(new Animated.Value(0)).current;
  const isHidden     = useRef(false);
  // Track visibility for pointerEvents — avoids blocking touch when hidden
  const [hidden, setHidden] = useState(false);

  const show = useCallback(() => {
    if (!isHidden.current) return;
    isHidden.current = false;
    setHidden(false);
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
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHidden(true);
    });
  }, [translateY, totalHeight]);

  useEffect(() => {
    const unsub = tabScrollBus.subscribe(dir => {
      if (dir === 'down') hide();
      else show();
    });
    return unsub;
  }, [hide, show]);

  const navigateToTab = (tabName: TabName) => {
    show();
    navigation.navigate('Main', { screen: tabName });
  };

  return (
    <Animated.View
      // pointerEvents="none" when hidden: the bar doesn't intercept any touch
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[
        styles.container,
        {
          height: totalHeight,
          paddingBottom: bottomInset || 8,
          transform: [{ translateY }],
        },
      ]}
    >
      {TABS.map(tab => {
        const isActive = tab.name === activeTab;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigateToTab(tab.name)}
            activeOpacity={0.75}
          >
            {isActive && <View style={styles.activeDot} />}
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon
                name={tab.icon}
                size={23}
                color={isActive ? COLORS.text : '#525252'}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,10,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
    paddingTop: 6,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 10 },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: COLORS.text,
  },
  iconWrap: {
    width: 44, height: 38, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});

export default FloatingTabBar;
