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

type ConnectState = 'idle' | 'connecting' | 'connected';

class ChatSocketService {
  private client: Client | null = null;
  private state: ConnectState = 'idle';
  private pendingCallbacks: Array<() => void> = [];
  private currentSubscription: any = null;

  /**
   * Connect to STOMP broker.
   * - If already connected: fires callback immediately.
   * - If connecting: queues callback to be fired when connection succeeds.
   * - If idle: initiates connection.
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
      // Already connecting – callback is queued, nothing else to do
      return;
    }

    this.state = 'connecting';
    const token = await AsyncStorage.getItem('accessToken');

    this.client = new Client({
      brokerURL: 'ws://10.0.2.2:8086/chat/ws/chat',
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('[STOMP] Connected');
        this.state = 'connected';
        const callbacks = [...this.pendingCallbacks];
        this.pendingCallbacks = [];
        callbacks.forEach(cb => cb());
      },
      onStompError: frame => {
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
      console.warn('[STOMP] Cannot subscribe – client not connected');
      return;
    }

    // Unsubscribe from previous topic if switching rooms
    this.currentSubscription?.unsubscribe();

    this.currentSubscription = this.client.subscribe(
      `/topic/conversation/${conversationId}`,
      message => {
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
