import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, Image, ScrollView, SafeAreaView, Dimensions, ActivityIndicator 
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Feather';
import { searchService, Genre } from '../../services/search.service';
import { Book } from '../../types/index';

const { width } = Dimensions.get('window');

const SearchScreen = ({ navigation }: any) => {
  // State quản lý Input và Chế độ hiển thị
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false); // True: Hiện kết quả, False: Hiện khám phá
  const [searchTab, setSearchTab] = useState<'all' | 'title' | 'author'>('all');

  // Data State
  const [genres, setGenres] = useState<Genre[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const inputRef = useRef<TextInput>(null);

  // Load dữ liệu ban đầu (Explore)
  useEffect(() => {
    const fetchExploreData = async () => {
      const [genreData, trendingData] = await Promise.all([
        searchService.getGenres(),
        searchService.getTrendingBooks()
      ]);
      setGenres(genreData);
      setTrendingBooks(trendingData);
    };
    fetchExploreData();
  }, []);

  // Xử lý tìm kiếm (Debounce đơn giản hoặc gọi trực tiếp khi Enter)
  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length > 0) {
      setLoadingSearch(true);
      const res = await searchService.searchBooks(text, searchTab);
      setSearchResults(res);
      setLoadingSearch(false);
    } else {
      setSearchResults([]);
    }
  };

  // Thay đổi tab tìm kiếm
  useEffect(() => {
    if (isSearching && searchText) {
       handleSearch(searchText);
    }
  }, [searchTab]);

  // --- COMPONENT CON ---

  // 1. Header Search Input
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
      
      {/* Nút Hủy hiện ra khi đang mode tìm kiếm */}
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

  // 2. View Khám phá (Genres & Trending)
  const renderExploreView = () => (
    <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      {/* Section: Thể loại (Genres) - Ảnh 1 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>KHÁM PHÁ THỂ LOẠI</Text>
        <TouchableOpacity>
           <Text style={styles.viewAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.genreGrid}>
        {genres.map((genre) => (
          <TouchableOpacity 
            key={genre.id} 
            style={[styles.genreItem, { backgroundColor: genre.color }]}
          >
            <Text style={styles.genreText}>{genre.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section: Sách Trending*/}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>CÓ THỂ BẠN CŨNG THÍCH</Text>
        <TouchableOpacity>
           <Icon name="chevron-right" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={trendingBooks}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.bookCardHorizontal}>
            <Image source={{ uri: item.coverUrl }} style={styles.bookCover} />
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: SPACING.m }}
      />

      {/* Placeholder cho New Release */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>SÁCH MỚI PHÁT HÀNH</Text>
        <TouchableOpacity>
           <Icon name="chevron-right" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
       <FlatList
        data={trendingBooks} // Demo data
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id + 'new'}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.bookCardHorizontal}>
            <Image source={{ uri: item.coverUrl }} style={styles.bookCover} />
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: 40 }}
      />
    </ScrollView>
  );

  // 3. View Kết quả tìm kiếm (Tabs & List) - Ảnh 3
  const renderSearchView = () => (
    <View style={styles.contentContainer}>
      
      {/* Tabs Switcher */}
      <View style={styles.tabContainer}>
         {(['all', 'title', 'author'] as const).map((tab) => {
            const labels = { all: 'Tất cả', title: 'Tên sách', author: 'Tác giả' };
            const isActive = searchTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => setSearchTab(tab)}
              >
                 <Text style={[styles.tabText, isActive && styles.activeTabText]}>{labels[tab]}</Text>
              </TouchableOpacity>
            )
         })}
      </View>

      <Text style={styles.resultCount}>
         Hiển thị {searchResults.length} kết quả
      </Text>

      {/* Result List */}
      {loadingSearch ? (
         <ActivityIndicator color={COLORS.text} style={{ marginTop: 20 }} />
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
               <Image source={{ uri: item.coverUrl }} style={styles.resultCover} />
               <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultAuthor}>bởi {item.author}</Text>
                  <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
                     <Icon name="star" size={12} color="#FFD700" />
                     <Text style={{color:'#777', fontSize:12, marginLeft:4}}>
                        {(item as any).ratingAverage || 'Chưa có'} đánh giá
                     </Text>
                  </View>
               </View>
               {/* Nút add nhanh */}
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

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {isSearching ? renderSearchView() : renderExploreView()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  headerContainer: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m,
    borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: COLORS.background
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E1E1E', borderRadius: 8, height: 40
  },
  input: { flex: 1, color: COLORS.text, marginLeft: 8, fontSize: 16, height: '100%' },
  cancelText: { color: COLORS.text, fontSize: 16, marginLeft: 12 },

  contentContainer: { flex: 1 },

  // --- Explore Styles ---
  sectionHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: SPACING.m, marginBottom: 12 
  },
  sectionTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' },
  viewAllText: { color: COLORS.text, fontSize: 12, borderWidth: 1, borderColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  
  // Genre Grid
  genreGrid: { 
    flexDirection: 'row', flexWrap: 'wrap', 
    paddingHorizontal: SPACING.m, justifyContent: 'space-between', gap: 10 
  },
  genreItem: {
    width: (width - SPACING.m * 2 - 10) / 2, // Chia đôi màn hình trừ padding
    height: 60, borderRadius: 8, 
    justifyContent: 'center', paddingLeft: 12,
    marginBottom: 8
  },
  genreText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Horizontal Book Card
  bookCardHorizontal: { width: 100, marginRight: 16 },
  bookCover: { width: 100, height: 150, borderRadius: 6, resizeMode: 'cover', backgroundColor: '#333' },
  bookTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginTop: 8 },
  bookAuthor: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  // --- Search Results Styles ---
  tabContainer: { flexDirection: 'row', padding: SPACING.m, gap: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E' },
  activeTabItem: { backgroundColor: COLORS.text }, // Màu trắng khi active
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