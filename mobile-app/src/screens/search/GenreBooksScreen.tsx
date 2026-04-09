// src/screens/search/GenreBooksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING } from '../../constants/theme';
import { bookApi } from '../../api/bookApi';
import { Book } from '../../types/index';
import { RootStackParamList } from '../../types/navigation';
import { resolveMediaUrl } from '../../config/env';

const mapBookResponse = (item: any): Book => {
  const coverUrl = resolveMediaUrl(item.coverImage ?? item.coverUrl, 'covers');
  return {
    id:            String(item.id),
    title:         item.title ?? '',
    authors:       item.authors ?? [],
    author:        item.authors?.[0] ?? 'Unknown',
    coverUrl,
    coverImage:    coverUrl,
    status:        item.shelfStatus ?? 'none',
    progress:      item.progressPercent ?? 0,
    totalPages:    item.totalPages ?? 0,
    totalPage:     item.totalPages ?? 0,
    currentPage:   0,
    averageRating: item.averageRating ?? 0,
    totalViews:    item.totalViews ?? 0,
    description:   item.description,
  } as Book;
};

type Props = NativeStackScreenProps<RootStackParamList, 'GenreBooks'>;

const GenreBooksScreen = ({ route, navigation }: Props) => {
  const { genreId, genreName } = route.params;

  const [books, setBooks]     = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: any = await bookApi.getByCategory(genreId);
      const items: any[] = resp?.result ?? resp ?? [];
      setBooks(items.map(mapBookResponse));
    } catch (err) {
      console.error('[GenreBooksScreen] Failed to load books:', err);
      setError('Không thể tải sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [genreId]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const renderBook = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <Image
        source={{
          uri: item.coverUrl || 'https://via.placeholder.com/70x105.png?text=No+Cover',
        }}
        style={styles.cover}
      />
      <View style={styles.bookInfo}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.author} numberOfLines={1}>bởi {item.author}</Text>
        {(item.averageRating ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            <Icon name="star" size={13} color="#FFD700" />
            <Text style={styles.rating}>{(item.averageRating ?? 0).toFixed(1)}</Text>
          </View>
        )}
        {(item.totalViews ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            <Icon name="eye" size={13} color={COLORS.textSecondary} />
            <Text style={styles.views}>{item.totalViews} lượt đọc</Text>
          </View>
        )}
      </View>
      <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{genreName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.text} />
          <Text style={styles.hint}>Đang tải sách...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Icon name="alert-circle" size={40} color="#E94057" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooks}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : books.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="book-open" size={48} color={COLORS.textSecondary} />
          <Text style={styles.hint}>Chưa có sách nào trong thể loại này.</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={renderBook}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.m, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1E1E1E',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: {
    color: COLORS.text, fontSize: 18, fontWeight: 'bold',
    flex: 1, textAlign: 'center',
  },

  list: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, paddingBottom: 60 },

  bookItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, backgroundColor: COLORS.background,
  },
  cover: {
    width: 70, height: 105, borderRadius: 6,
    marginRight: 12, resizeMode: 'cover', backgroundColor: '#222',
  },
  bookInfo: { flex: 1 },
  title: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  author: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rating: { color: '#FFD700', fontSize: 13 },
  views: { color: COLORS.textSecondary, fontSize: 12 },

  separator: { height: 1, backgroundColor: '#1A1A1A' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: SPACING.m },
  hint: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  errorText: { color: '#E94057', textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#222', borderRadius: 8 },
  retryText: { color: COLORS.text, fontWeight: 'bold' },
});

export default GenreBooksScreen;
