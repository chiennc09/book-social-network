/**
 * TodayRecsSection
 *
 * Displays the short-term "Today's Picks" recommendation row.
 * The list is driven by `useTodayRecommendations` which automatically
 * refreshes every time the screen receives focus — so returning from
 * BookDetail shows recommendations informed by the book just viewed.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { useTodayRecommendations } from '../../hooks/useTodayRecommendations';
import { Book } from '../../types';
import { resolveMediaUrl } from '../../config/env';


// Map source value to a human-readable badge label
const sourceLabel: Record<string, string | undefined> = {
  'session-cbf':  'Dựa trên hôm nay',
  'recency-cbf':  'Gần đây của bạn',
  'trending':     'Đang thịnh hành',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  onBookPress: (bookId: string) => void;
  limit?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TodayRecsSection = ({ userId, onBookPress, limit = 10 }: Props) => {
  const { books, source, loading } = useTodayRecommendations(userId, limit);

  // Don't render anything during load if there's nothing cached yet
  if (!loading && books.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>GỢI Ý HÔM NAY</Text>
          {sourceLabel[source] && (
            <Text style={styles.sourceSubtitle}>{sourceLabel[source]}</Text>
          )}
        </View>
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={COLORS.textSecondary}
          size="small"
        />
      ) : (
        <FlatList<Book>
          data={books}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => `today_${item.id}_${idx}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => onBookPress(item.id)}
            >
              <Image
                source={{
                  uri:
                    resolveMediaUrl(item.coverUrl || (item as any).coverImage, 'covers') ||
                    'https://via.placeholder.com/100x150.png?text=No+Cover',
                }}
                style={styles.cover}
                resizeMode="cover"
              />
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.author} numberOfLines={1}>
                {item.author}
              </Text>
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.m,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  sourceSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  loader: {
    marginVertical: 16,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.m,
  },
  card: {
    width: 100,
    marginRight: 16,
  },
  cover: {
    width: 100,
    height: 150,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  title: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 17,
  },
  author: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

export default TodayRecsSection;
