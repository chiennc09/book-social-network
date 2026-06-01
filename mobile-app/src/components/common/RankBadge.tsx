import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

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

const BADGE_THEMES: Record<string, {
  textColor: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  iconName: string;
  glowColor?: string;
}> = {
  NEWBIE: {
    textColor: '#D39E82', // Bronze
    borderColor: '#D39E82',
    bgColor: 'rgba(211, 158, 130, 0.15)',
    iconColor: '#D39E82',
    iconName: 'award'
  },
  BOOKWORM: {
    textColor: '#8BD3DD', // Teal / Silver
    borderColor: '#A5C4D4',
    bgColor: 'rgba(165, 196, 212, 0.15)',
    iconColor: '#8BD3DD',
    iconName: 'book-open'
  },
  SCHOLAR: {
    textColor: '#F5C469', // Bright Amber/Gold
    borderColor: '#F5C469',
    bgColor: 'rgba(245, 196, 105, 0.15)',
    iconColor: '#F5C469',
    iconName: 'shield',
    glowColor: 'rgba(245, 196, 105, 0.3)'
  },
  MASTER: {
    textColor: '#C084FC', // Glowing Purple
    borderColor: '#C084FC',
    bgColor: 'rgba(192, 132, 252, 0.18)',
    iconColor: '#C084FC',
    iconName: 'zap',
    glowColor: 'rgba(192, 132, 252, 0.5)'
  },
};

const DEFAULT_THEME = {
  textColor: '#F5C469',
  borderColor: '#F5C469',
  bgColor: 'rgba(245, 196, 105, 0.15)',
  iconColor: '#F5C469',
  iconName: 'award',
};

export const RankBadge: React.FC<RankBadgeProps> = ({ badge, showGlow = true, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const theme = BADGE_THEMES[badge.code] || DEFAULT_THEME;

  useEffect(() => {
    // Elegant slow breathing pulse for the glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2000,
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
          shadowRadius: 6,
          elevation: 5,
        },
        style,
      ]}
    >
      {badge.iconUrl ? (
        <Image source={{ uri: badge.iconUrl }} style={styles.badgeIcon} />
      ) : (
        <Icon name={theme.iconName} size={11} color={theme.iconColor} style={styles.featherIcon} />
      )}
      <Text style={[styles.badgeText, { color: theme.textColor }]}>{badge.name}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
