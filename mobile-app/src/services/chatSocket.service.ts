import { Client } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TextEncoder Polyfill for STOMP inside React Native
declare var global: any;
import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

class ChatSocketService {
  private client: Client | null = null;
  private currentSubscription: any = null;

  async connect(onConnectCallback?: () => void) {
    if (this.client && this.client.active) return;

    const token = await AsyncStorage.getItem('accessToken');

    this.client = new Client({
      brokerURL: 'ws://10.0.2.2:8086/chat/ws/chat',
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("WebSocket Connected!");
        if (onConnectCallback) onConnectCallback();
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    this.client.activate();
  }

  subscribeToConversation(conversationId: string, onMessageReceived: (msg: any) => void) {
    if (!this.client || !this.client.active) {
      console.warn("Cannot subscribe, STOMP client not active");
      return;
    }

    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }

    this.currentSubscription = this.client.subscribe(`/topic/conversation/${conversationId}`, (message) => {
      if (message.body) {
        onMessageReceived(JSON.parse(message.body));
      }
    });

    console.log(`Subscribed to topic: /topic/conversation/${conversationId}`);
  }

  unsubscribe() {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
      this.currentSubscription = null;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }
}

export const chatSocketService = new ChatSocketService();
