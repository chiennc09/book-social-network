import axiosClient from './axiosClient';

export const fileApi = {
  upload: (formData: FormData, type: string = 'others') =>
    axiosClient.post(`http://10.0.2.2:8084/file/media/upload?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
