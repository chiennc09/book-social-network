import api from './client';

export const recommendationApi = {
  /** Get long-term ALS+CBF recommendations for a user */
  getForUser: async (userId: string) => {
    const res = await api.get(`/recommendation/api/v1/recommendations/${userId}`);
    return res.data;
  },

  /** Get today's session-based picks */
  getTodayForUser: async (userId: string, limit = 10) => {
    const res = await api.get(`/recommendation/api/v1/recommendations/${userId}/today`, {
      params: { limit },
    });
    return res.data;
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
