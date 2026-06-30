import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';

interface RankBadgeProps {
  badge: {
    code: string;
    name: string;
    description?: string;
    iconUrl?: string;
  };
  showGlow?: boolean;
  style?: StyleProp<ViewStyle>;
}

const getBadgeTheme = (code: string, isDarkMode: boolean) => {
  const themes: Record<string, {
    textColor: string;
    borderColor: string;
    bgColor: string;
    iconColor: string;
    iconName: string;
    glowColor?: string;
  }> = {
    NEWBIE: {
      textColor: isDarkMode ? '#FF9A76' : '#8A320F', // Bronze
      borderColor: isDarkMode ? 'rgba(255, 154, 118, 0.45)' : 'rgba(167, 74, 39, 0.45)',
      bgColor: isDarkMode ? 'rgba(255, 154, 118, 0.08)' : 'rgba(167, 74, 39, 0.06)',
      iconColor: isDarkMode ? '#FF9A76' : '#8A320F',
      iconName: 'award',
      glowColor: isDarkMode ? 'rgba(255, 154, 118, 0.15)' : undefined,
    },
    BOOKWORM: {
      textColor: isDarkMode ? '#00D2C4' : '#006B63', // Teal / Silver
      borderColor: isDarkMode ? 'rgba(0, 210, 196, 0.45)' : 'rgba(0, 122, 114, 0.45)',
      bgColor: isDarkMode ? 'rgba(0, 210, 196, 0.08)' : 'rgba(0, 122, 114, 0.06)',
      iconColor: isDarkMode ? '#00D2C4' : '#006B63',
      iconName: 'book-open',
      glowColor: isDarkMode ? 'rgba(0, 210, 196, 0.15)' : undefined,
    },
    SCHOLAR: {
      textColor: isDarkMode ? '#FFD000' : '#946300', // Gold
      borderColor: isDarkMode ? 'rgba(255, 208, 0, 0.55)' : 'rgba(184, 122, 0, 0.55)',
      bgColor: isDarkMode ? 'rgba(255, 208, 0, 0.1)' : 'rgba(184, 122, 0, 0.07)',
      iconColor: isDarkMode ? '#FFD000' : '#946300',
      iconName: 'shield',
      glowColor: isDarkMode ? 'rgba(255, 208, 0, 0.25)' : undefined,
    },
    MASTER: {
      textColor: isDarkMode ? '#E1A7FF' : '#5E0EA3', // Purple
      borderColor: isDarkMode ? 'rgba(225, 167, 255, 0.55)' : 'rgba(121, 40, 202, 0.55)',
      bgColor: isDarkMode ? 'rgba(225, 167, 255, 0.12)' : 'rgba(121, 40, 202, 0.08)',
      iconColor: isDarkMode ? '#E1A7FF' : '#5E0EA3',
      iconName: 'zap',
      glowColor: isDarkMode ? 'rgba(225, 167, 255, 0.35)' : undefined,
    },
  };

  const defaultTheme = {
    textColor: isDarkMode ? '#FFD000' : '#946300',
    borderColor: isDarkMode ? 'rgba(255, 208, 0, 0.45)' : 'rgba(184, 122, 0, 0.45)',
    bgColor: isDarkMode ? 'rgba(255, 208, 0, 0.08)' : 'rgba(184, 122, 0, 0.06)',
    iconColor: isDarkMode ? '#FFD000' : '#946300',
    iconName: 'award',
  };

  return themes[code] || defaultTheme;
};

export const RankBadge: React.FC<RankBadgeProps> = ({ badge, showGlow = true, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isDarkMode } = useTheme();
  const theme = getBadgeTheme(badge.code, isDarkMode);

  useEffect(() => {
    // Elegant slow breathing pulse for the glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const hasGlow = showGlow && !!theme.glowColor;

  return (
    <Animated.View
      style={[
        styles.badgeContainer,
        {
          borderColor: theme.borderColor,
          backgroundColor: theme.bgColor,
          transform: [{ scale: pulseAnim }],
        },
        hasGlow && {
          shadowColor: theme.glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 5,
          elevation: 4,
        },
        style,
      ]}
    >
      {badge.iconUrl ? (
        <Image source={{ uri: badge.iconUrl }} style={styles.badgeIcon} />
      ) : (
        <Icon name={theme.iconName} size={12} color={theme.iconColor} style={styles.featherIcon} />
      )}
      <Text style={[styles.badgeText, { color: theme.textColor }]}>{badge.name}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 6,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    marginRight: 4,
  },
  featherIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
});

export default RankBadge;
