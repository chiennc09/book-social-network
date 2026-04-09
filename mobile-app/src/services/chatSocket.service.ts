import { Client } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICE_PATHS } from '../config/env';

// TextEncoder Polyfill for STOMP inside React Native
declare var global: any;
import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

type ConnectState = 'idle' | 'connecting' | 'connected';

class ChatSocketService {
  private client: Client | null = null;
  private state: ConnectState = 'idle';
  private pendingCallbacks: Array<() => void> = [];
  private currentSubscription: any = null;

  /**
   * Connect to STOMP broker via API Gateway WebSocket.
   * - If already connected:  fires callback immediately.
   * - If connecting:         queues callback.
   * - If idle:               initiates connection.
   */
  async connect(onConnectCallback?: () => void) {
    if (this.state === 'connected' && this.client?.active) {
      onConnectCallback?.();
      return;
    }

    if (onConnectCallback) {
      this.pendingCallbacks.push(onConnectCallback);
    }

    if (this.state === 'connecting') {
      return; // Already connecting — callback is queued
    }

    this.state = 'connecting';
    const token = await AsyncStorage.getItem('accessToken');

    this.client = new Client({
      // WebSocket goes through Gateway → chat-service
      brokerURL: SERVICE_PATHS.chatWs,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5_000,
      heartbeatIncoming: 4_000,
      heartbeatOutgoing: 4_000,
      onConnect: () => {
        console.log('[STOMP] Connected to', SERVICE_PATHS.chatWs);
        this.state = 'connected';
        const callbacks = [...this.pendingCallbacks];
        this.pendingCallbacks = [];
        callbacks.forEach((cb) => cb());
      },
      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame.headers['message'], frame.body);
        this.state = 'idle';
        this.pendingCallbacks = [];
      },
      onWebSocketClose: () => {
        console.warn('[STOMP] WebSocket closed');
        this.state = 'idle';
        this.currentSubscription = null;
      },
    });

    this.client.activate();
  }

  subscribeToConversation(
    conversationId: string,
    onMessageReceived: (msg: any) => void,
  ) {
    if (!this.client || this.state !== 'connected') {
      console.warn('[STOMP] Cannot subscribe — client not connected');
      return;
    }

    // Unsubscribe from previous topic when switching rooms
    this.currentSubscription?.unsubscribe();

    this.currentSubscription = this.client.subscribe(
      `/topic/conversation/${conversationId}`,
      (message) => {
        if (message.body) {
          onMessageReceived(JSON.parse(message.body));
        }
      },
    );

    console.log(`[STOMP] Subscribed to /topic/conversation/${conversationId}`);
  }

  unsubscribe() {
    this.currentSubscription?.unsubscribe();
    this.currentSubscription = null;
  }

  /** Fully tear down the connection (call on logout) */
  disconnect() {
    this.unsubscribe();
    this.client?.deactivate();
    this.client = null;
    this.state = 'idle';
    this.pendingCallbacks = [];
  }
}

export const chatSocketService = new ChatSocketService();
