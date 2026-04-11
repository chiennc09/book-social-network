// src/screens/search/SearchScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Image, ScrollView, SafeAreaView, Dimensions, ActivityIndicator
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { searchService, Genre } from '../../services/search.service';
import { profileApi } from '../../api/profileApi';
import { recommendationApi } from '../../api/recommendationApi';
import { bookService } from '../../services/book.service';
import { Book } from '../../types/index';
import { UserProfile } from '../../types/user';
import { DEFAULT_AVATAR } from '../../constants/theme';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import TodayRecsSection from '../../components/book/TodayRecsSection';
import { resolveMediaUrl } from '../../config/env';
import { useTabBarScrollControl } from '../../navigation/BottomTabNavigator';

const { width } = Dimensions.get('window');


const SearchScreen = ({ navigation }: any) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const currentUserId: string = (authUser as any)?.id ?? (authUser as any)?.userId ?? '';

  // ── UI State ──────────────────────────────────────────────────────────────
  const [searchText, setSearchText]     = useState('');
  const [isSearching, setIsSearching]   = useState(false);
  const [searchTab, setSearchTab]       = useState<'all' | 'title' | 'author' | 'user'>('all');

  // ── Data State ────────────────────────────────────────────────────────────
  const [genres, setGenres]                     = useState<Genre[]>([]);
  const [trendingBooks, setTrendingBooks]       = useState<Book[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults]       = useState<Book[]>([]);
  const [searchUserResults, setSearchUserResults] = useState<UserProfile[]>([]);

  // ── Loading Flags ─────────────────────────────────────────────────────────
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [loadingSearch, setLoadingSearch]   = useState(false);

  const inputRef = useRef<TextInput>(null);
  const { onScroll } = useTabBarScrollControl();

  // ── Explore Data Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchExploreData = async () => {
      setLoadingExplore(true);
      try {
        // Fetch genres + trending in parallel; recommended needs userId
        const [genreData, trendingData] = await Promise.all([
          searchService.getGenres(),
          searchService.getTrendingBooks(7, 10),
        ]);

        setGenres(genreData);
        setTrendingBooks(trendingData);

        // Personalised recommendations — only if we have a userId
        if (currentUserId) {
          const bookIds = await recommendationApi.getRecommendations(currentUserId, 10);

          if (bookIds.length > 0) {
            // Extra guard against duplicate IDs from older cached computations
            const uniqueBookIds = Array.from(new Set(bookIds));
            // Resolve bookIds → Book objects (parallel, skip failures)
            const bookDetails = await Promise.all(
              uniqueBookIds.map((id) =>
                bookService.getBookBasicInfo(id).catch(() => null),
              ),
            );
            setRecommendedBooks(
              bookDetails.filter((b): b is Book => b !== null),
            );
          }
          // bookIds.length === 0 → cold start → leave recommendedBooks = []
          // The section will be hidden by the UI (see renderExploreView)
        }
      } catch (err) {
        console.error('[SearchScreen] fetchExploreData error:', err);
      } finally {
        setLoadingExplore(false);
      }
    };

    fetchExploreData();
  }, [currentUserId]);

  // ── Search Handler ────────────────────────────────────────────────────────
  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length > 0) {
      setLoadingSearch(true);
      if (searchTab === 'user') {
        const res: any = await profileApi.searchUsers(text);
        setSearchUserResults(res.result || res.data?.result || res.data || []);
      } else {
        const res = await searchService.searchBooks(text, searchTab);
        setSearchResults(res);
      }
      setLoadingSearch(false);
    } else {
      setSearchResults([]);
      setSearchUserResults([]);
    }
  };

  useEffect(() => {
    if (isSearching && searchText) {
      handleSearch(searchText);
    }
  }, [searchTab]);

  // ── Shared Book Card (Horizontal) ─────────────────────────────────────────
  const renderBookCard = (item: Book, keySuffix = '') => (
    <TouchableOpacity
      key={item.id + keySuffix}
      style={styles.bookCardHorizontal}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <Image
      source={{ uri: resolveMediaUrl(item.coverUrl || item.coverImage, 'covers') || 'https://via.placeholder.com/100x150.png?text=No+Cover' }}
        style={styles.bookCover}
      />
      <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
    </TouchableOpacity>
  );

  // ── 1. Header Search Input ────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={COLORS.textSecondary} style={{ marginLeft: 10 }} />
        <TextInput
          ref={inputRef}
          placeholder="Tên sách, tác giả hoặc ISBN"
          placeholderTextColor="#666"
          style={styles.input}
          value={searchText}
          onFocus={() => setIsSearching(true)}
          onChangeText={handleSearch}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); setSearchResults([]); }}>
            <Icon name="x-circle" size={18} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
          </TouchableOpacity>
        )}
      </View>

      {isSearching && (
        <TouchableOpacity onPress={() => {
          setIsSearching(false);
          setSearchText('');
          inputRef.current?.blur();
        }}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── 2. Explore View ───────────────────────────────────────────────────────
  const renderExploreView = () => {
    if (loadingExplore) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.text} />
        </View>
      );
    }

    return (
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >

        {/* ── Genres — show only top 6 ───────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>KHÁM PHÁ THỂ LOẠI</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllGenres')}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.genreGrid}>
          {genres.slice(0, 6).map((genre, index) => {
            // Curated harmonious palette for 6 slots
            const PALETTE = [
              { bg: '#E94057', icon: 'heart',       glyph: '❤' },
              { bg: '#6C63FF', icon: 'zap',         glyph: '⚡' },
              { bg: '#F27121', icon: 'sun',         glyph: '☀' },
              { bg: '#11998e', icon: 'leaf',        glyph: '🌿' },
              { bg: '#2193b0', icon: 'globe',       glyph: '🌍' },
              { bg: '#8E2DE2', icon: 'star',        glyph: '✦' },
            ];
            const palette = PALETTE[index % PALETTE.length];
            return (
              <TouchableOpacity
                key={genre.id}
                style={[styles.genreItem, { backgroundColor: palette.bg }]}
                onPress={() => navigation.navigate('GenreBooks', { genreId: genre.id, genreName: genre.name })}
                activeOpacity={0.82}
              >
                <View style={styles.genreIconCircle}>
                  <Icon name={palette.icon} size={16} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.genreText} numberOfLines={1}>{genre.name}</Text>
                <Icon name="chevron-right" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Today's Picks — short-term session recommendations ──────── */}
        {currentUserId ? (
          <TodayRecsSection
            userId={currentUserId}
            onBookPress={(bookId) => navigation.navigate('BookDetail', { bookId })}
            limit={10}
          />
        ) : null}

        {/* ── Long-term Recommended Books — hidden for cold-start users ─ */}
        {recommendedBooks.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>CÓ THỂ BẠN CŨNG THÍCH</Text>
              <TouchableOpacity>
                <Icon name="chevron-right" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={recommendedBooks}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id + '_rec'}
              renderItem={({ item }) => renderBookCard(item, '_rec')}
              contentContainerStyle={{ paddingHorizontal: SPACING.m }}
              scrollEnabled
            />
          </>
        )}

        {/* ── Trending Books — always shown ────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>SÁCH TRENDING</Text>
          <TouchableOpacity>
            <Icon name="chevron-right" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={trendingBooks}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id + '_trend'}
          renderItem={({ item }) => renderBookCard(item, '_trend')}
          contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: 40 }}
          scrollEnabled
        />

      </ScrollView>
    );
  };

  // ── 3. Search Results View ────────────────────────────────────────────────
  const renderSearchView = () => (
    <View style={styles.contentContainer}>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'title', 'author', 'user'] as const).map((tab) => {
          const labels = { all: 'Tất cả', title: 'Tên sách', author: 'Tác giả', user: 'Người dùng' };
          const isActive = searchTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
              onPress={() => setSearchTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{labels[tab]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.resultCount}>
        Hiển thị {searchTab === 'user' ? searchUserResults.length : searchResults.length} kết quả
      </Text>

      {loadingSearch ? (
        <ActivityIndicator color={COLORS.text} style={{ marginTop: 20 }} />
      ) : searchTab === 'user' ? (
        <FlatList
          data={searchUserResults}
          keyExtractor={(item) => item.id || item.userId || ''}
          contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: 50 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => navigation.navigate('UserProfile', { userId: item.userId || item.id })}
            >
              <Image
                source={{ uri: item.avatar || DEFAULT_AVATAR }}
                style={[styles.resultCover, { width: 50, height: 50, borderRadius: 25 }]}
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{item.displayName || item.username}</Text>
                <Text style={styles.resultAuthor}>@{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#555' }}>Không tìm thấy người dùng nào.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: 50 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
            >
              <Image
                source={{ uri: resolveMediaUrl(item.coverUrl, 'covers') || 'https://via.placeholder.com/50x75.png?text=No+Cover' }}
                style={styles.resultCover}
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultAuthor}>bởi {item.author}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="star" size={12} color="#FFD700" />
                  <Text style={{ color: '#777', fontSize: 12, marginLeft: 4 }}>
                    {item.averageRating && item.averageRating > 0
                      ? item.averageRating.toFixed(1)
                      : 'Chưa có đánh giá'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity>
                <Icon name="plus-circle" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#555' }}>Không tìm thấy sách nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {isSearching ? renderSearchView() : renderExploreView()}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  headerContainer: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m,
    borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: COLORS.background,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E1E1E', borderRadius: 8, height: 40,
  },
  input: { flex: 1, color: COLORS.text, marginLeft: 8, fontSize: 16, height: '100%' },
  cancelText: { color: COLORS.text, fontSize: 16, marginLeft: 12 },

  contentContainer: { flex: 1 },

  // Explore
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, marginBottom: 12,
  },
  sectionTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' },
  viewAllText: {
    color: COLORS.text, fontSize: 12, borderWidth: 1, borderColor: '#333',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
  },

  // Genre Grid — 2-column layout, pill buttons
  genreGrid: {
    paddingHorizontal: SPACING.m,
    gap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  genreItem: {
    width: (width - SPACING.m * 2 - 10) / 2,
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  genreIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  genreText: { color: 'white', fontWeight: '700', fontSize: 13, flex: 1 },

  // Horizontal Book Card
  bookCardHorizontal: { width: 100, marginRight: 16 },
  bookCover: { width: 100, height: 150, borderRadius: 6, resizeMode: 'cover', backgroundColor: '#333' },
  bookTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginTop: 8 },
  bookAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  // Search Results
  tabContainer: { flexDirection: 'row', padding: SPACING.m, gap: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E' },
  activeTabItem: { backgroundColor: COLORS.text },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  activeTabText: { color: 'black', fontWeight: 'bold' },

  resultCount: { color: COLORS.textSecondary, marginLeft: SPACING.m, marginBottom: 10, fontSize: 13 },

  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#101010' },
  resultCover: { width: 50, height: 75, borderRadius: 4, marginRight: 12 },
  resultInfo: { flex: 1 },
  resultTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  resultAuthor: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
});

export default SearchScreen;