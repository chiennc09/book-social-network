/**
 * SimilarBooksSection
 *
 * Displays a horizontal scrolling list of books similar to the current book,
 * powered by the Content-Based Filtering (CBF) vector search API.
 *
 * Shown on the Book Detail screen below the reviews as:
 * "Bạn cũng có thể thích"
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { recommendationApi } from '../../api/recommendationApi';
import { bookService } from '../../services/book.service';
import { Book } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookSummary {
  id: string;
  title: string;
  authors?: string[];    // Backend trả về mảng String
  coverUrl?: string;
  averageRating?: number; // Backend trả về averageRating
}

interface Props {
  bookId: string;
  onBookPress: (bookId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SimilarBooksSection = ({ bookId, onBookPress }: Props) => {
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSimilarBooks = useCallback(async () => {
    if (!bookId) return;
    try {
      setLoading(true);
      // 1. Fetch similar bookIds from recommendation-service
      const similarIds = await recommendationApi.getSimilarBooks(bookId, 8);
      if (similarIds.length === 0) {
        setBooks([]);
        return;
      }
      // 2. Fetch book details from book-service in parallel
      const settled = await Promise.allSettled(
        similarIds.map((id) => bookService.getBookBasicInfo(id)),
      );
      const loaded: BookSummary[] = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value as BookSummary)
        .filter(Boolean);
      setBooks(loaded);
    } catch (err) {
      console.warn('[SimilarBooksSection] Failed to load similar books:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadSimilarBooks();
  }, [loadSimilarBooks]);

  // Don't render the section at all if there's nothing to show
  if (!loading && books.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Bạn cũng có thể thích</Text>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={COLORS.textSecondary}
          size="small"
        />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item, index) => item.id ? item.id.toString() + index : index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => onBookPress(item.id)}
            >
              <Image
                source={{ uri: item.coverUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.authors && item.authors.length > 0 ? (
                <Text style={styles.cardAuthor} numberOfLines={1}>{item.authors.join(', ')}</Text>
              ) : null}
              {item.averageRating != null && item.averageRating > 0 ? (
                <Text style={styles.cardRating}>★ {item.averageRating.toFixed(1)}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 20,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 16,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 120,
    marginRight: 4,
  },
  cover: {
    width: 120,
    height: 175,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 17,
  },
  cardAuthor: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  cardRating: {
    color: '#FFD700',
    fontSize: 11,
    marginTop: 4,
  },
});

export default SimilarBooksSection;
