import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TOKEN = 'access_token';
const KEY_REFRESH_TOKEN = 'refresh_token';

const storage = {
  getToken: async () => {
    try {
      return await AsyncStorage.getItem(KEY_TOKEN);
    } catch (error) {
      console.error('Error getting token', error);
      return null;
    }
  },

  setToken: async (token: string) => {
    try {
      await AsyncStorage.setItem(KEY_TOKEN, token);
    } catch (error) {
      console.error('Error setting token', error);
    }
  },

  getRefreshToken: async () => {
    try {
      return await AsyncStorage.getItem(KEY_REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token', error);
      return null;
    }
  },

  setRefreshToken: async (token: string) => {
    try {
      await AsyncStorage.setItem(KEY_REFRESH_TOKEN, token);
    } catch (error) {
      console.error('Error setting refresh token', error);
    }
  },

  clearTokens: async () => {
    try {
      await AsyncStorage.multiRemove([KEY_TOKEN, KEY_REFRESH_TOKEN]);
    } catch (error) {
      console.error('Error clearing tokens', error);
    }
  },
};

export default storage;
