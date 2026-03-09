import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../constants/theme';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { HomeDrawerNavigator, ProfileDrawerNavigator } from './DrawerNavigators';
import LibraryScreen from '../screens/library/LibraryScreen';
import SearchScreen from '../screens/search/SearchScreen';

import ChatListScreen from '../screens/chat/ChatListScreen';

// Placeholder cho các màn hình chưa code
const Placeholder = ({ name }: { name: string }) => (
  <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: 'white' }}>{name}</Text>
  </View>
);

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen 
        name="Home" component={HomeDrawerNavigator}
        options={{ tabBarIcon: ({ color }) => <Icon name="home" color={color} size={26} /> }} 
      />
      <Tab.Screen 
        name="Search" component={SearchScreen} 
        options={{ tabBarIcon: ({ color }) => <Icon name="search" color={color} size={26} /> }} 
      />
      <Tab.Screen 
        name="Chatbot" component={ChatListScreen} 
        options={{ tabBarIcon: ({ color }) => <Icon name="message-circle" color={color} size={26} /> }} 
      />
      <Tab.Screen 
        name="Library"
        component={LibraryScreen} 
        options={{
          tabBarIcon: ({ color }) => <Icon name="book" color={color} size={26} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" component={ProfileDrawerNavigator}
        options={{ tabBarIcon: ({ color }) => <Icon name="user" color={color} size={26} /> }} 
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;