import api from './client';

export const recommendationApi = {
  /** Get long-term ALS+CBF recommendations for a user */
  getForUser: async (userId: string) => {
    const res = await api.get(`/recommendation/api/v1/recommendations/${userId}`);
    const data = res.data;
    return {
      userId: data.userId,
      recommendedBookIds: data.longTerm?.bookIds ?? data.trending?.bookIds ?? [],
      source: data.longTerm?.source ?? data.trending?.source ?? 'empty',
    };
  },

  /** Get today's session-based picks */
  getTodayForUser: async (userId: string, limit = 10) => {
    const res = await api.get(`/recommendation/api/v1/recommendations/${userId}`, {
      params: { limit },
    });
    const data = res.data;
    return {
      userId: data.userId,
      todayBookIds: data.shortTerm?.bookIds ?? [],
      source: data.shortTerm?.source ?? 'empty',
    };
  },

  /** Get similar books */
  getSimilar: async (bookId: string, limit = 10) => {
    const res = await api.get(`/recommendation/api/v1/similar/${bookId}`, {
      params: { limit },
    });
    return res.data;
  },

  /** Trigger ALS re-training job */
  triggerTraining: async () => {
    const res = await api.post('/recommendation/api/v1/jobs/train');
    return res.data;
  },

  /** Flush all recommendation caches from Redis */
  flushCache: async () => {
    const res = await api.post('/recommendation/api/v1/admin/flush-cache');
    return res.data;
  },

  /** Purge Qdrant orphan vectors */
  purgeQdrantOrphans: async () => {
    const res = await api.post('/recommendation/api/v1/admin/purge-qdrant-orphans');
    return res.data;
  },
};
