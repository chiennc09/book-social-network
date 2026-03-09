import axiosClient from './axiosClient';

const BASE_URL = 'http://10.0.2.2:8086/chat';

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
