import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING } from '../../constants/theme';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { bookApi } from '../../api/bookApi';
import { fileApi } from '../../api/fileApi';
import bookAxiosClient from '../../api/bookAxiosClient';

interface ShareBookModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ShareBookModal: React.FC<ShareBookModalProps> = ({ visible, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);

  const [coverFile, setCoverFile] = useState<any>(null);
  const [bookFile, setBookFile] = useState<any>(null);
  const [totalPages, setTotalPages] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCategories();
      // Reset form
      setTitle('');
      setAuthor('');
      setDescription('');
      setCategoryId('');
      setCoverFile(null);
      setBookFile(null);
      setTotalPages('');
    }
  }, [visible]);

  const fetchCategories = async () => {
    try {
      const resp: any = await bookAxiosClient.get('/categories');
      if (resp && resp.result) {
        setCategories(resp.result);
        if (resp.result.length > 0) {
          setCategoryId(resp.result[0].id);
        }
      }
    } catch (error) {
       console.log('Error fetching categories:', error);
    }
  };

  const pickCover = async () => {
    try {
      const res = await pick({
        type: [types.images],
      });
      if (res && res.length > 0) {
        setCoverFile(res[0]);
      }
    } catch (err) {
      if (!isErrorWithCode(err) || err.code !== errorCodes.OPERATION_CANCELED) {
         console.error(err);
      }
    }
  };

  const pickDocument = async () => {
    try {
      const res = await pick({
        type: [types.pdf, types.plainText, 'application/epub+zip'],
      });
      if (res && res.length > 0) {
        setBookFile(res[0]);
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
         // User cancelled
      } else {
         console.error(err);
      }
    }
  };

  const handleShare = async () => {
    if (!title || !author) {
      Alert.alert('Lỗi', 'Vui lòng nhập Tên sách và Tác giả');
      return;
    }

    setLoading(true);
    try {
      let coverUrl = '';
      let pdfUrl = '';
      let epubUrl = '';

      // 1. Upload Cover (image picked via document picker)
      if (coverFile) {
        const resp = await fileApi.uploadFromDocumentPicker(coverFile, 'covers');
        if (resp?.url) {
          // Store only the MinIO full URL — resolveMediaUrl handles display
          coverUrl = resp.url;
        }
      }

      // 2. Upload Document (PDF or EPUB)
      if (bookFile) {
        const docName = (bookFile.name as string) || '';
        const docType = (bookFile.type as string) || 'application/pdf';
        const typePath =
          docName.toLowerCase().endsWith('.epub') || docType === 'application/epub+zip'
            ? 'epubs'
            : 'pdfs';

        const resp = await fileApi.uploadFromDocumentPicker(bookFile, typePath);
        if (resp?.url) {
          if (typePath === 'epubs') epubUrl = resp.url;
          else pdfUrl = resp.url;
        }
      }

      // 3. Create Book
      const bookData = {
        title,
        authors: [author],
        description,
        categoryId: categoryId || categories[0]?.id,
        coverImage: coverUrl,
        pdfPath: pdfUrl,
        epubPath: epubUrl,
        isPublic: true, // Chia sẻ cộng đồng là Public
        totalPages: parseInt(totalPages) || 0
      };

      await bookApi.create(bookData);
      
      Alert.alert('Thành công', 'Sách đã được chia sẻ lên Cộng đồng!');
      onSuccess();
      onClose();

    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể chia sẻ sách lúc này');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chia sẻ sách</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Icon name="x" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Pick Cover Section */}
            <TouchableOpacity style={styles.coverPicker} onPress={pickCover}>
              {coverFile ? (
                <Image source={{ uri: coverFile.uri }} style={styles.coverImagePreview} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Icon name="image" size={32} color={COLORS.textSecondary} />
                  <Text style={styles.coverText}>Chọn ảnh bìa</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Tên sách <Text style={{color: 'red'}}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Nhập tên sách..." placeholderTextColor="#666" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Tác giả <Text style={{color: 'red'}}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Tác giả..." placeholderTextColor="#666" value={author} onChangeText={setAuthor} />

            <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
              <View style={{flex: 1}}>
                 <Text style={[styles.label, {marginTop: 0}]}>Thể loại</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, {marginBottom: 0}]}>
                   {categories.map(cat => (
                     <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.catChip, categoryId === cat.id && styles.catChipActive]}
                        onPress={() => setCategoryId(cat.id)}
                     >
                       <Text style={[styles.catChipText, categoryId === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
              </View>
              <View style={{width: 100}}>
                 <Text style={[styles.label, {marginTop: 0}]}>Số trang <Text style={{color: 'red'}}>*</Text></Text>
                 <TextInput style={[styles.input, {paddingVertical: 8}]} keyboardType="numeric" placeholder="VD: 120" placeholderTextColor="#666" value={totalPages} onChangeText={setTotalPages} />
              </View>
            </View>

            <Text style={styles.label}>Mô tả tóm tắt</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              placeholder="Nhập giới thiệu ngắn gọn..." 
              placeholderTextColor="#666" 
              multiline 
              value={description} 
              onChangeText={setDescription} 
            />

            <Text style={styles.label}>Tệp đính kèm (PDF / EPUB)</Text>
            <TouchableOpacity style={styles.filePickerBtn} onPress={pickDocument}>
              <Icon name="file-text" size={20} color={COLORS.text} />
              <Text style={styles.filePickerText} numberOfLines={1}>
                {bookFile ? bookFile.name : 'Chọn file sách (.pdf, .epub)'}
              </Text>
            </TouchableOpacity>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleShare} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Chia sẻ ngay</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { height: '85%', backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.m },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  
  coverPicker: { alignSelf: 'center', width: 120, height: 160, backgroundColor: '#2A2A2A', borderRadius: 8, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  coverImagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  label: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#2A2A2A', borderRadius: 8, padding: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: '#333' },
  
  categoryScroll: { flexDirection: 'row', marginBottom: 10 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2A2A2A', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#333' },
  catChipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  catChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: '#000' },

  filePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  filePickerText: { color: COLORS.text, marginLeft: 10, flex: 1 },

  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  submitBtn: { backgroundColor: COLORS.text, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});

export default ShareBookModal;
