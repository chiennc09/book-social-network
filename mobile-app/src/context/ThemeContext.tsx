import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/theme';

export type ThemePreference = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemePreference; // 'light' | 'dark'
  isDarkMode: boolean; // Computed current state
  colors: typeof DARK_COLORS;
  setThemeMode: (mode: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ASYNC_STORAGE_KEY = '@user_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemePreference>('dark'); // Default to dark theme

  useEffect(() => {
    // Load theme preference from AsyncStorage on mount
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (savedPreference === 'light' || savedPreference === 'dark') {
          setThemeModeState(savedPreference);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      }
    };
    loadThemePreference();
  }, []);

  const setThemeMode = async (mode: ThemePreference) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  // Determine current active theme
  const isDarkMode = themeMode === 'dark';

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
