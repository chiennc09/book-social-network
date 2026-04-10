import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
  Keyboard, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { authApi } from '../../api/authApi';
import { loginUser } from '../../redux/authSlice';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/store';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';

// ── Field rendered outside parent to prevent remount on state change ──────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  icon: string;
  error?: string;
  fieldRef?: React.RefObject<TextInput>;
  nextRef?: React.RefObject<TextInput>;
  secureEntry?: boolean;
  show?: boolean;
  toggleSecure?: () => void;
  keyboardType?: any;
  returnKeyType?: 'next' | 'done' | 'go';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}

// Defined OUTSIDE the screen component so React never remounts it on re-render
const Field = ({
  label, value, onChange, placeholder, icon, error,
  fieldRef, nextRef, secureEntry, show, toggleSecure,
  keyboardType = 'default', returnKeyType = 'next',
  autoCapitalize = 'none',
}: FieldProps) => (
  <View style={fStyles.wrap}>
    <Text style={fStyles.label}>{label}</Text>
    <View style={[fStyles.row, error && fStyles.rowError]}>
      <Icon name={icon} size={18} color={COLORS.textSecondary} style={fStyles.icon} />
      <TextInput
        ref={fieldRef}
        style={fStyles.input}
        placeholder={placeholder}
        placeholderTextColor="#505050"
        value={value}
        onChangeText={onChange}
        secureTextEntry={secureEntry && !show}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={() => nextRef?.current?.focus()}
        blurOnSubmit={false}
        autoCorrect={false}
        spellCheck={false}
      />
      {secureEntry && (
        <TouchableOpacity onPress={toggleSecure} style={{ padding: 4 }}>
          <Icon name={show ? 'eye-off' : 'eye'} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
    {!!error && <Text style={fStyles.error}>{error}</Text>}
  </View>
);

const fStyles = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  label:    { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  row:      {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#151515', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12,
  },
  rowError: { borderColor: '#e74c3c' },
  icon:     { marginRight: 8 },
  input:    {
    flex: 1, color: COLORS.text, fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
  },
  error: { color: '#e74c3c', fontSize: 12, marginTop: 4, marginLeft: 4 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

interface Errors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  dob?: string;
}

const RegisterScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [email, setEmail]             = useState('');
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [dob, setDob]                 = useState('');
  const [city, setCity]               = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<Errors>({});

  // Refs for focus chain
  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const emailRef   = useRef<TextInput>(null);
  const lastRef    = useRef<TextInput>(null);
  const firstRef   = useRef<TextInput>(null);
  const dobRef     = useRef<TextInput>(null);
  const cityRef    = useRef<TextInput>(null);

  // useCallback so toggle functions are stable refs
  const togglePass    = useCallback(() => setShowPass(p => !p),    []);
  const toggleConfirm = useCallback(() => setShowConfirm(p => !p), []);

  const validate = (): boolean => {
    const e: Errors = {};
    if (username.trim().length < 4) e.username = 'Tên đăng nhập phải có ít nhất 4 ký tự';
    if (password.length < 6)        e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (password !== confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Email không hợp lệ';
    if (dob) {
      const dobDate = new Date(dob);
      const minAge  = new Date();
      minAge.setFullYear(minAge.getFullYear() - 10);
      if (isNaN(dobDate.getTime()) || dobDate > minAge)
        e.dob = 'Ngày sinh không hợp lệ (YYYY-MM-DD, phải ≥10 tuổi)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({
        username:  username.trim(),
        password,
        email:     email.trim(),
        firstName: firstName.trim() || undefined,
        lastName:  lastName.trim()  || undefined,
        dob:       dob.trim()       || undefined,
        city:      city.trim()      || undefined,
      });

      // Auto-login immediately after registration
      const result = await dispatch(
        loginUser({ username: username.trim(), password }),
      );

      if (loginUser.rejected.match(result)) {
        // Registration succeeded but auto-login failed → go to Login
        Alert.alert(
          '🎉 Đăng ký thành công!',
          'Hãy đăng nhập để tiếp tục.',
          [{ text: 'OK', onPress: () => navigation.navigate('Auth') }],
        );
      }
      // If loginUser.fulfilled → RootNavigator auto-switches to Main (isAuthenticated = true)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng ký thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-left" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Logo + Title */}
          <View style={styles.hero}>
            <Icon name="book-open" size={48} color={COLORS.primary} />
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Tham gia cộng đồng đọc sách ngay hôm nay</Text>
          </View>

          <Text style={styles.section}>THÔNG TIN ĐĂNG NHẬP</Text>

          <Field
            label="Tên đăng nhập *"
            value={username}
            onChange={setUsername}
            placeholder="Tối thiểu 4 ký tự"
            icon="user"
            error={errors.username}
            nextRef={passRef}
          />
          <Field
            label="Mật khẩu *"
            value={password}
            onChange={setPassword}
            placeholder="Tối thiểu 6 ký tự"
            icon="lock"
            secureEntry
            show={showPass}
            toggleSecure={togglePass}
            error={errors.password}
            fieldRef={passRef}
            nextRef={confirmRef}
          />
          <Field
            label="Xác nhận mật khẩu *"
            value={confirmPassword}
            onChange={setConfirm}
            placeholder="Nhập lại mật khẩu"
            icon="lock"
            secureEntry
            show={showConfirm}
            toggleSecure={toggleConfirm}
            error={errors.confirmPassword}
            fieldRef={confirmRef}
            nextRef={emailRef}
          />

          <Text style={[styles.section, { marginTop: 20 }]}>THÔNG TIN CÁ NHÂN</Text>

          <Field
            label="Email *"
            value={email}
            onChange={setEmail}
            placeholder="example@email.com"
            icon="mail"
            keyboardType="email-address"
            error={errors.email}
            fieldRef={emailRef}
            nextRef={lastRef}
          />

          <View style={styles.nameRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Field
                label="Họ"
                value={lastName}
                onChange={setLastName}
                placeholder="Họ"
                icon="tag"
                autoCapitalize="words"
                fieldRef={lastRef}
                nextRef={firstRef}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Field
                label="Tên"
                value={firstName}
                onChange={setFirstName}
                placeholder="Tên"
                icon="tag"
                autoCapitalize="words"
                fieldRef={firstRef}
                nextRef={dobRef}
              />
            </View>
          </View>

          <Field
            label="Ngày sinh (YYYY-MM-DD)"
            value={dob}
            onChange={setDob}
            placeholder="1999-01-01"
            icon="calendar"
            keyboardType="numeric"
            error={errors.dob}
            fieldRef={dobRef}
            nextRef={cityRef}
          />
          <Field
            label="Thành phố"
            value={city}
            onChange={setCity}
            placeholder="Hà Nội, TP.HCM..."
            icon="map-pin"
            autoCapitalize="words"
            fieldRef={cityRef}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="black" />
              : <Text style={styles.btnText}>Đăng ký</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
            <Text style={styles.loginLinkText}>
              Đã có tài khoản?{' '}
              <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll:    { paddingHorizontal: SPACING.m, paddingBottom: 60 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginBottom: 8 },
  backBtn:   { padding: 8 },
  hero:      { alignItems: 'center', paddingVertical: 20 },
  title:     { color: COLORS.text, fontSize: 26, fontWeight: 'bold', marginTop: 12 },
  subtitle:  { color: COLORS.textSecondary, fontSize: 14, marginTop: 6, textAlign: 'center' },
  section:   { color: '#505050', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  nameRow:   { flexDirection: 'row' },
  btn:       {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  btnText:      { color: 'black', fontWeight: 'bold', fontSize: 16 },
  loginLink:    { alignItems: 'center', marginTop: 20, paddingBottom: 10 },
  loginLinkText: { color: COLORS.textSecondary, fontSize: 14 },
});

export default RegisterScreen;
