// src/screens/search/AllGenresScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING } from '../../constants/theme';
import { searchService, Genre } from '../../services/search.service';
import { RootStackParamList } from '../../types/navigation';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'AllGenres'>;

const AllGenresScreen = ({ navigation }: Props) => {
  const [genres, setGenres]   = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGenres = async () => {
      setLoading(true);
      try {
        const data = await searchService.getGenres();
        setGenres(data);
      } catch (err) {
        console.error('[AllGenresScreen] err:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGenres();
  }, []);

  const renderGenre = ({ item }: { item: Genre }) => (
    <TouchableOpacity
      style={[styles.genreItem, { backgroundColor: item.color }]}
      onPress={() => navigation.navigate('GenreBooks', { genreId: item.id, genreName: item.name })}
    >
      <Text style={styles.genreText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả Thể loại</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.text} />
        </View>
      ) : (
        <FlatList
          data={genres}
          keyExtractor={(item) => item.id}
          renderItem={renderGenre}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
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

  list: { padding: SPACING.m, paddingBottom: 60 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },

  genreItem: {
    width: (width - SPACING.m * 2 - 16) / 2,
    height: 80, borderRadius: 8,
    justifyContent: 'center', paddingHorizontal: 16,
  },
  genreText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AllGenresScreen;
