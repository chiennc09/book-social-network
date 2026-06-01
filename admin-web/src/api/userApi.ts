import api from './client';

export interface User {
  id: string;
  username: string;
  email?: string;
  roles: Array<{ name: string }>;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserRequest {
  password?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

export const userApi = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get('/identity/users');
    return res.data.result ?? [];
  },

  getById: async (id: string): Promise<User> => {
    const res = await api.get(`/identity/users/${id}`);
    return res.data.result;
  },

  create: async (req: CreateUserRequest): Promise<User> => {
    const res = await api.post('/identity/users/registration', req);
    return res.data.result;
  },

  update: async (id: string, req: UpdateUserRequest): Promise<User> => {
    const res = await api.put(`/identity/users/${id}`, req);
    return res.data.result;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/identity/users/${id}`);
  },
};
