// src/screens/search/AllGenresScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING } from '../../constants/theme';
import { searchService, Genre } from '../../services/search.service';
import { RootStackParamList } from '../../types/navigation';
import FloatingTabBar from '../../components/navigation/FloatingTabBar';
import { useTabBarScrollControl } from '../../navigation/BottomTabNavigator';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'AllGenres'>;

// ── Curated color palette — same system as SearchScreen (6 colors cycling) ────
const PALETTE = [
  { bg: '#E94057', icon: 'heart'   },
  { bg: '#6C63FF', icon: 'zap'     },
  { bg: '#F27121', icon: 'sun'     },
  { bg: '#11998e', icon: 'leaf'    },
  { bg: '#2193b0', icon: 'globe'   },
  { bg: '#8E2DE2', icon: 'star'    },
  { bg: '#c0392b', icon: 'feather' },
  { bg: '#16a085', icon: 'wind'    },
  { bg: '#8e44ad', icon: 'layers'  },
  { bg: '#d35400', icon: 'flame'   },
  { bg: '#27ae60', icon: 'coffee'  },
  { bg: '#2980b9', icon: 'compass' },
] as const;

const AllGenresScreen = ({ navigation }: Props) => {
  const [genres, setGenres]   = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const { onScroll } = useTabBarScrollControl();

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

  const renderGenre = ({ item, index }: { item: Genre; index: number }) => {
    const p = PALETTE[index % PALETTE.length];
    return (
      <TouchableOpacity
        style={[styles.genreItem, { backgroundColor: p.bg }]}
        onPress={() => navigation.navigate('GenreBooks', { genreId: item.id, genreName: item.name })}
        activeOpacity={0.82}
      >
        <View style={styles.iconCircle}>
          <Icon name={p.icon} size={16} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.genreText} numberOfLines={1}>{item.name}</Text>
        <Icon name="chevron-right" size={14} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>
    );
  };

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
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      )}

      <FloatingTabBar activeTab="Search" />
    </SafeAreaView>
  );
};

const ITEM_W = (width - SPACING.m * 2 - 12) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.m, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222',
  },
  backBtn:     { width: 40, alignItems: 'flex-start' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },

  list:          { padding: SPACING.m, paddingBottom: 90 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },

  genreItem: {
    width: ITEM_W,
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  iconCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  genreText: { color: 'white', fontWeight: '700', fontSize: 13, flex: 1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AllGenresScreen;
