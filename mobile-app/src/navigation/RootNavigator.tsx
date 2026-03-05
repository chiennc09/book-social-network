import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

// Import các màn hình
import LoginScreen from '../screens/auth/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import NewThreadScreen from '../screens/post/NewThreadScreen';
import CommentScreen from '../screens/post/CommentScreen';
import BookDetailScreen from '../screens/book/BookDetailScreen';
import ReaderScreen from '../screens/book/ReaderScreen';
import ChallengeScreen from '../screens/library/ChallengeScreen';
import FriendManagementScreen from '../screens/profile/FriendManagementScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';

import { RootStackParamList } from '../types/navigation';
import { COLORS } from '../constants/theme';
import { RootState, AppDispatch } from '../redux/store';
import { loadUser } from '../redux/authSlice';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isInitializing } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  if (isInitializing) {
      // You might want to return a loading spinner here
      return null;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {!isAuthenticated ? (
           // Stack Auth
           <Stack.Group>
             <Stack.Screen name="Auth" component={LoginScreen} /> 
           </Stack.Group>
        ) : (
           // Stack Main
           <Stack.Group>
             <Stack.Screen name="Main" component={BottomTabNavigator} />
             <Stack.Screen name="CommentScreen" component={CommentScreen} />
           </Stack.Group>
        )}

        <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
           <Stack.Screen name="EditProfile" component={EditProfileScreen} />
           <Stack.Screen name="NewThread" component={NewThreadScreen} />
           <Stack.Screen name="BookDetail" component={BookDetailScreen} />
           <Stack.Screen name="Reader" component={ReaderScreen} options={{ presentation: 'fullScreenModal' }} />
           <Stack.Screen name="Challenge" component={ChallengeScreen} />
           <Stack.Screen name="FriendManagement" component={FriendManagementScreen} />
           <Stack.Screen name="UserProfile" component={UserProfileScreen} />
           <Stack.Screen name="ChatList" component={ChatListScreen} />
           <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
        </Stack.Group>

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;