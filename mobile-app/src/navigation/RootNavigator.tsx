import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import LoginScreen         from '../screens/auth/LoginScreen';
import RegisterScreen      from '../screens/auth/RegisterScreen';
import BottomTabNavigator  from './BottomTabNavigator';
import EditProfileScreen   from '../screens/profile/EditProfileScreen';
import NewThreadScreen     from '../screens/post/NewThreadScreen';
import CommentScreen       from '../screens/post/CommentScreen';
import BookDetailScreen    from '../screens/book/BookDetailScreen';
import ReaderScreen        from '../screens/book/ReaderScreen';
import ChallengeScreen     from '../screens/library/ChallengeScreen';
import FriendManagementScreen from '../screens/profile/FriendManagementScreen';
import UserProfileScreen   from '../screens/profile/UserProfileScreen';
import ChatListScreen      from '../screens/chat/ChatListScreen';
import ChatRoomScreen      from '../screens/chat/ChatRoomScreen';
import GenreBooksScreen    from '../screens/search/GenreBooksScreen';
import AllGenresScreen     from '../screens/search/AllGenresScreen';

import { RootStackParamList } from '../types/navigation';
import { COLORS }             from '../constants/theme';
import { RootState, AppDispatch } from '../redux/store';
import { loadUser, logoutUser }   from '../redux/authSlice';
import { setAuthNavigator }       from '../infrastructure/api/axiosClient';
import { useTheme }               from '../context/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Shared screen animation presets ──────────────────────────────────────────
const SLIDE_RIGHT  = { animation: 'slide_from_right' } as const;
const SLIDE_BOTTOM = { animation: 'slide_from_bottom', presentation: 'modal' } as const;
const NONE         = { animation: 'none' } as const;

const RootNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isInitializing } = useSelector((state: RootState) => state.auth);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // Give axiosClient a handle to navigate on 401 / expired session
  useEffect(() => {
    setAuthNavigator({
      resetToAuth: () => {
        dispatch(logoutUser());
        // Navigation resets automatically via isAuthenticated guard
      },
    });
  }, [dispatch]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    dark: isDarkMode,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <NavigationContainer ref={navRef} theme={navTheme}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/*
       * KEY PATTERN: changing 'key' forces the Navigator to fully remount,
       * clearing the entire navigation stack on auth state change.
       * This prevents the "stuck on modal screen after logout" bug.
       */}
      <Stack.Navigator
        key={isAuthenticated ? 'authed' : 'guest'}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {!isAuthenticated ? (
          // ── Auth Stack ─────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Auth"     component={LoginScreen}    options={NONE} />
            <Stack.Screen name="Register" component={RegisterScreen} options={SLIDE_RIGHT} />
          </>
        ) : (
          // ── Main Stack ─────────────────────────────────────────────────────
          <>
            {/* Root tabs */}
            <Stack.Screen name="Main"          component={BottomTabNavigator} options={NONE} />

            {/* Screens that slide in from right (standard push) */}
            <Stack.Screen name="CommentScreen"      component={CommentScreen}      options={SLIDE_RIGHT} />
            <Stack.Screen name="UserProfile"        component={UserProfileScreen}  options={SLIDE_RIGHT} />
            <Stack.Screen name="GenreBooks"         component={GenreBooksScreen}   options={SLIDE_RIGHT} />
            <Stack.Screen name="AllGenres"          component={AllGenresScreen}    options={SLIDE_RIGHT} />
            <Stack.Screen name="FriendManagement"   component={FriendManagementScreen} options={SLIDE_RIGHT} />
            <Stack.Screen name="ChatList"           component={ChatListScreen}     options={SLIDE_RIGHT} />
            <Stack.Screen name="ChatRoom"           component={ChatRoomScreen}     options={SLIDE_RIGHT} />
            <Stack.Screen name="Challenge"          component={ChallengeScreen}    options={SLIDE_RIGHT} />

            {/* Screens that slide up as modal */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={SLIDE_BOTTOM} />
            <Stack.Screen name="NewThread"   component={NewThreadScreen}   options={SLIDE_BOTTOM} />
            <Stack.Screen name="BookDetail"  component={BookDetailScreen}  options={SLIDE_BOTTOM} />
            <Stack.Screen name="Reader"      component={ReaderScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;