import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';

const NewThreadScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread mới</Text>
        <View style={{ width: 30 }} /> 
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
           <Image source={{ uri: 'https://picsum.photos/500/300' }} style={styles.avatar} />
           <View style={styles.inputContainer}>
              <Text style={styles.username}>_chie.nc</Text>
              <TextInput 
                placeholder="Có gì mới?" 
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                multiline
                autoFocus
              />
              {/* Toolbar Icons */}
              <View style={styles.toolbar}>
                 <Icon name="image" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                 <Icon name="camera" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                 <Icon name="mic" size={20} color={COLORS.textSecondary} style={styles.toolIcon} />
                 <Icon name="book" size={20} color={COLORS.textSecondary} style={styles.toolIcon} /> 
                 {/* Icon Book để tag sách */}
              </View>
           </View>
        </View>
      </View>
      
      <View style={styles.footer}>
         <TouchableOpacity style={styles.postBtn}>
            <Text style={styles.postBtnText}>Đăng</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.m, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#333' },
  cancelText: { color: COLORS.text, fontSize: 16 },
  headerTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  content: { padding: SPACING.m, flex: 1 },
  row: { flexDirection: 'row' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  inputContainer: { flex: 1 },
  username: { color: COLORS.text, fontWeight: 'bold', marginBottom: 4 },
  input: { color: COLORS.text, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'row', marginTop: 10 },
  toolIcon: { marginRight: 20 },
  footer: { padding: SPACING.m, alignItems: 'flex-end' },
  postBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: 'black', fontWeight: 'bold' },
});

export default NewThreadScreen;