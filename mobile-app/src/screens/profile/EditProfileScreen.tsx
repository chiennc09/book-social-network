// src/screens/profile/EditProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Switch, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import { resolveMediaUrl } from '../../config/env';
import { userService } from '../../services/user.service';
import { launchImageLibrary } from 'react-native-image-picker';
import { fileApi } from '../../api/fileApi';
import { useDispatch } from 'react-redux';
import { updateUserAvatar } from '../../redux/authSlice';
import { useTheme } from '../../context/ThemeContext';

const EditProfileScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const currentUser = route.params?.user || {};

  const [bio, setBio] = useState(currentUser.bio || '');
  const [link, setLink] = useState(currentUser.link || '');
  const [isPrivate, setIsPrivate] = useState(currentUser.isPrivate || false);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null); // full image picker asset
  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const { colors, isDarkMode } = useTheme();

  const handleSelectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        console.error('ImagePicker Error: ', result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri || null);
        setSelectedAsset(asset); // store full asset for upload
      }
    } catch (error) {
       console.error(error);
    }
  };

  const handleSave = async () => {
      setSaving(true);
      try {
        let uploadedAvatarUrl = currentUser.avatar;

        if (avatarUri && avatarUri !== currentUser.avatar) {
           const asset = selectedAsset ?? { uri: avatarUri, fileName: 'avatar.jpg', type: 'image/jpeg' };
           try {
              const uploaded = await fileApi.uploadFromImagePicker(asset, 'avatars');
              uploadedAvatarUrl = uploaded?.url;
           } catch (err) {
              console.error('Upload avatar failed', err);
              Alert.alert('Lỗi', 'Lỗi khi tải ảnh đại diện lên');
              setSaving(false);
              return;
           }
        }

        await userService.updateProfile({ 
          bio, 
          link, 
          isPrivate,
          avatar: uploadedAvatarUrl,
          firstName,
          lastName,
        });
        
        if (uploadedAvatarUrl) {
            dispatch(updateUserAvatar(resolveMediaUrl(uploadedAvatarUrl, 'avatars')));
        }
        
        navigation.goBack();
      } catch (error) {
        console.error(error);
        Alert.alert('Lỗi', 'Cập nhật thất bại');
      } finally {
        setSaving(false);
      }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top - 6, 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Hủy</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chỉnh sửa trang cá nhân</Text>
        
        <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={[styles.doneText, { color: colors.text }]}>Xong</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { borderColor: colors.border }]}>
        {/* Form Group: Username & Avatar (Read-only) */}
        <View style={styles.formGroup}>
            <View style={{flex: 1}}>
                <Text style={[styles.label, { color: colors.text }]}>Tên đăng nhập</Text>
                <Text style={[styles.valueLocked, { color: colors.textSecondary }]}>@{currentUser.username}</Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <TouchableOpacity onPress={handleSelectImage}>
                  <Image 
                      source={{ uri: avatarUri || resolveMediaUrl(currentUser.avatar, 'avatars') || 'https://via.placeholder.com/150' }} 
                      style={[styles.avatarMini, { backgroundColor: colors.border }]} 
                  />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSelectImage} style={{marginTop: 6}}>
                 <Text style={{color: '#0095f6', fontSize: 12, fontWeight: 'bold'}}>Đổi ảnh</Text>
              </TouchableOpacity>
            </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Họ & Tên đệm Input */}
        <View style={styles.formGroupVertical}>
            <Text style={[styles.label, { color: colors.text }]}>Họ</Text>
            <TextInput 
                placeholder="Nhập họ và tên đệm" 
                placeholderTextColor={colors.textSecondary} 
                style={[styles.input, { color: colors.text }]} 
                value={lastName}
                onChangeText={setLastName}
            />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Tên Input */}
        <View style={styles.formGroupVertical}>
            <Text style={[styles.label, { color: colors.text }]}>Tên</Text>
            <TextInput 
                placeholder="Nhập tên" 
                placeholderTextColor={colors.textSecondary} 
                style={[styles.input, { color: colors.text }]} 
                value={firstName}
                onChangeText={setFirstName}
            />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Bio Input */}
        <View style={styles.formGroupVertical}>
            <Text style={[styles.label, { color: colors.text }]}>Tiểu sử</Text>
            <TextInput 
                placeholder="+ Viết tiểu sử" 
                placeholderTextColor={colors.textSecondary} 
                style={[styles.input, { color: colors.text }]} 
                value={bio}
                onChangeText={setBio}
                multiline
            />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Link Input */}
        <View style={styles.formGroupVertical}>
            <Text style={[styles.label, { color: colors.text }]}>Liên kết</Text>
            <TextInput 
                placeholder="+ Thêm liên kết" 
                placeholderTextColor={colors.textSecondary} 
                style={[styles.input, { color: colors.text }]}
                value={link}
                onChangeText={setLink}
            />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        {/* Private Toggle */}
        <View style={[styles.formGroup, {marginTop: SPACING.m}]}>
            <Text style={[styles.label, { color: colors.text }]}>Trang cá nhân riêng tư</Text>
            <Switch 
                value={isPrivate} 
                onValueChange={setIsPrivate} 
                trackColor={{false: colors.border, true: colors.text}}
                thumbColor={isDarkMode ? 'black' : 'white'}
            />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.m, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontSize: 16 },
  doneText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  content: { padding: SPACING.m, marginTop: SPACING.s, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, marginHorizontal: SPACING.m },
  formGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.s },
  formGroupVertical: { paddingVertical: SPACING.s },
  label: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  valueLocked: { color: COLORS.text, fontSize: 14 },
  input: { color: COLORS.text, fontSize: 14, padding: 0 },
  avatarMini: { width: 50, height: 50, borderRadius: 25 },
  divider: { height: 0.5, backgroundColor: COLORS.border, marginLeft: 0 },
});

export default EditProfileScreen;

