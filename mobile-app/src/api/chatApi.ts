import axiosClient from './axiosClient';

const BASE_URL = 'http://10.0.2.2:8086/chat';

export const chatApi = {
  // Get all conversations for the logic user
  myConversations: () => {
    return axiosClient.get(`${BASE_URL}/conversations`);
  },

  // Create or get existing conversation
  createConversation: (data: { participantIds: string[], type: string }) => {
    return axiosClient.post(`${BASE_URL}/conversations`, data);
  },

  // Get messages for a specific conversation
  getMessages: (conversationId: string) => {
    return axiosClient.get(`${BASE_URL}/messages/${conversationId}`);
  },

  // Send a message via REST (fallback if websocket fails, or just initial implementation)
  sendMessage: (data: { conversationId: string, message: string }) => {
    return axiosClient.post(`${BASE_URL}/messages`, data);
  }
};
