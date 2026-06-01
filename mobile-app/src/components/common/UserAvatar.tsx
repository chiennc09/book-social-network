import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { resolveMediaUrl } from '../../config/env';
import { DEFAULT_AVATAR } from '../../constants/theme';

interface UserAvatarProps {
  /** Relative key, full URL, or null from the DB */
  url: string | null | undefined;
  /** Size of the avatar (width and height) */
  size?: number;
  /** Custom styles to apply to the Image component */
  style?: StyleProp<ImageStyle>;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ url, size = 40, style }) => {
  // Defensive layering: automatically resolve URL if relative key leaks through raw APIs
  const resolvedUri = resolveMediaUrl(url, 'avatars') || DEFAULT_AVATAR;

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#222', // Dark background while loading
        },
        style,
      ]}
      defaultSource={{ uri: DEFAULT_AVATAR }}
    />
  );
};
