export const DARK_COLORS = {
  background: '#101010', // Màu đen của Threads
  text: '#FFFFFF',
  textSecondary: '#777777',
  border: '#333333',
  primary: '#FFFFFF', // Nút bấm chính
  danger: '#FF3040',
  card: '#1A1A1A',
};

export const LIGHT_COLORS = {
  background: '#FFFFFF', // Màu sáng
  text: '#101010',
  textSecondary: '#666666',
  border: '#E5E5E5',
  primary: '#000000', // Nút bấm chính đen
  danger: '#FF3040',
  card: '#F0F0F0',
};

// Cũ: giữ nguyên để không làm hỏng các màn hình/component chưa refactor
export const COLORS = DARK_COLORS;

export const SPACING = {
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

import { SERVICE_PATHS } from '../config/env';
export const DEFAULT_AVATAR = `${SERVICE_PATHS.file}/media/download/avatars/default-avatar.jpg`;