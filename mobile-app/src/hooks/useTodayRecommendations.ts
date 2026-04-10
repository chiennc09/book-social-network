/**
 * useTodayRecommendations
 *
 * Fetches the short-term "Today's Picks" list for the current user.
 *
 * Key behaviour:
 *  - On mount: load immediately.
 *  - On focus (useFocusEffect): re-fetch every time the screen comes into
 *    view — this ensures that returning from BookDetail (where a VIEW event
 *    was fired) triggers a fresh list showing content related to what was
 *    just viewed.
 *  - The refresh is debounced by a 300ms guard so rapid tab switching
 *    doesn't cause duplicate network calls.
 */
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { recommendationApi } from '../api/recommendationApi';
import { bookService } from '../services/book.service';
import { Book } from '../types';

interface TodayRecsState {
  books: Book[];
  source: string;
  loading: boolean;
}

export function useTodayRecommendations(userId: string, limit = 10) {
  const [state, setState] = useState<TodayRecsState>({
    books: [],
    source: 'empty',
    loading: true,
  });

  // Prevent overlapping fetches from rapid focus events
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const DEBOUNCE_MS = 300;

  const load = useCallback(async () => {
    if (!userId) return;

    const now = Date.now();
    if (fetchingRef.current || now - lastFetchRef.current < DEBOUNCE_MS) return;

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { ids, source } = await recommendationApi.getTodayRecommendations(userId, limit);

      if (ids.length === 0) {
        setState({ books: [], source, loading: false });
        return;
      }

      // Resolve bookIds → Book objects in parallel, skip failures gracefully
      const settled = await Promise.allSettled(
        ids.map((id) => bookService.getBookBasicInfo(id)),
      );

      const books: Book[] = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value as Book)
        .filter(Boolean);

      setState({ books, source, loading: false });
    } catch (err) {
      console.warn('[useTodayRecommendations] Error:', err);
      setState((prev) => ({ ...prev, loading: false }));
    } finally {
      fetchingRef.current = false;
    }
  }, [userId, limit]);

  // Re-fetch every time the screen receives focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { ...state, reload: load };
}
