import axiosClient from './axiosClient';
import { SERVICE_PATHS } from '../config/env';

const BASE_URL = SERVICE_PATHS.chat;

export const chatApi = {
  // Get all conversations for the logic user
  myConversations: () => {
    return axiosClient.get(`${BASE_URL}/conversations/my-conversations`);
  },

  // Create or get existing conversation
  createConversation: (data: { participantIds: string[], type: string }) => {
    return axiosClient.post(`${BASE_URL}/conversations/create`, data);
  },

  // Get messages for a specific conversation
  getMessages: (conversationId: string) => {
    return axiosClient.get(`${BASE_URL}/messages/${conversationId}`);
  },

  // Send a message via REST
  sendMessage: (data: { conversationId: string; message: string; bookAttachment?: any }) => {
    return axiosClient.post(`${BASE_URL}/messages/create`, data);
  }
};
