import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Switch, Image, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { resolveMediaUrl } from '../../config/env';
import { userService } from '../../services/user.service';
import { launchImageLibrary } from 'react-native-image-picker';
import { fileApi } from '../../api/fileApi';
import { useDispatch } from 'react-redux';
import { updateUserAvatar } from '../../redux/authSlice';

const EditProfileScreen = ({ navigation, route }: any) => {
  const dispatch = useDispatch();
  // Lấy data user được truyền từ màn hình trước (nếu có)
  const currentUser = route.params?.user || {};

  const [bio, setBio] = useState(currentUser.bio || '');
  const [link, setLink] = useState(currentUser.link || '');
  const [isPrivate, setIsPrivate] = useState(currentUser.isPrivate || false);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null); // full image picker asset

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
           // Use the stored asset object for proper RN multipart upload
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

        // Gọi Service
        await userService.updateProfile({ 
          bio, 
          link, 
          isPrivate,
          avatar: uploadedAvatarUrl
        });
        
        // Cần dispatch action update Redux store nếu thực tế
        if (uploadedAvatarUrl) {
            dispatch(updateUserAvatar(resolveMediaUrl(uploadedAvatarUrl, 'avatars')));
        }
        
        // Thành công thì back về
        navigation.goBack();
      } catch (error) {
        console.error(error);
        Alert.alert('Lỗi', 'Cập nhật thất bại');
      } finally {
        setSaving(false);
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa trang cá nhân</Text>
        
        <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.doneText}>Xong</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Form Group: Username & Avatar (Read-only) */}
        <View style={styles.formGroup}>
            <View style={{flex: 1}}>
                <Text style={styles.label}>Tên</Text>
                <Text style={styles.valueLocked}>{currentUser.displayName} ({currentUser.username})</Text>
            </View>
            {/* Nếu có ảnh thì hiện, ko thì placeholder */}
            <View style={{alignItems: 'center'}}>
              <TouchableOpacity onPress={handleSelectImage}>
                  <Image 
                      source={{ uri: avatarUri || resolveMediaUrl(currentUser.avatar, 'avatars') || 'https://via.placeholder.com/150' }} 
                      style={styles.avatarMini} 
                  />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSelectImage} style={{marginTop: 6}}>
                 <Text style={{color: '#0095f6', fontSize: 12, fontWeight: 'bold'}}>Đổi ảnh</Text>
              </TouchableOpacity>
            </View>
        </View>
        <View style={styles.divider} />

        {/* Bio Input */}
        <View style={styles.formGroupVertical}>
            <Text style={styles.label}>Tiểu sử</Text>
            <TextInput 
                placeholder="+ Viết tiểu sử" 
                placeholderTextColor={COLORS.textSecondary} 
                style={styles.input} 
                value={bio}
                onChangeText={setBio}
                multiline
            />
        </View>
        <View style={styles.divider} />

        {/* Link Input */}
        <View style={styles.formGroupVertical}>
            <Text style={styles.label}>Liên kết</Text>
            <TextInput 
                placeholder="+ Thêm liên kết" 
                placeholderTextColor={COLORS.textSecondary} 
                style={styles.input}
                value={link}
                onChangeText={setLink}
            />
        </View>
        <View style={styles.divider} />
        
        {/* Private Toggle */}
        <View style={[styles.formGroup, {marginTop: SPACING.m}]}>
            <Text style={styles.label}>Trang cá nhân riêng tư</Text>
            <Switch 
                value={isPrivate} 
                onValueChange={setIsPrivate} 
                trackColor={{false: '#333', true: COLORS.text}}
                thumbColor={'black'}
            />
        </View>
      </View>
    </SafeAreaView>
  );
};

// ... Styles giữ nguyên như file cũ ...
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