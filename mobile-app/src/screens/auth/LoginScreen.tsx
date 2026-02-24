import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, SPACING } from '../../constants/theme';
import { loginUser } from '../../redux/authSlice';
import { RootState, AppDispatch } from '../../redux/store';

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  // Lắng nghe lỗi từ Redux store
  useEffect(() => {
    if (error) {
      Alert.alert('Đăng nhập thất bại', error);
    }
  }, [error]);

  const handleLogin = () => {
    // Validate dữ liệu đầu vào
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
        Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
        return;
    }

    // Dispatch action login
    dispatch(loginUser({ username: cleanUsername, password: cleanPassword }));
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Đăng nhập</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Tên đăng nhập"
            placeholderTextColor={COLORS.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Chưa có tài khoản? Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center', padding: SPACING.m },
  title: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginBottom: SPACING.xl, textAlign: 'center' },
  input: {
    backgroundColor: '#1E1E1E', color: COLORS.text, borderRadius: 12, padding: SPACING.m, marginBottom: SPACING.m,
    borderWidth: 1, borderColor: COLORS.border
  },
  button: { backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 12, alignItems: 'center', marginTop: SPACING.s },
  buttonText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: SPACING.l, alignItems: 'center' },
  linkText: { color: COLORS.textSecondary },
});

export default LoginScreen;