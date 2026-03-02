import { DeviceEventEmitter } from 'react-native';

export const EventNames = {
  POST_UPDATED: 'POST_UPDATED',
  POST_DELETED: 'POST_DELETED',
  POST_CREATED: 'POST_CREATED',
  BOOK_PROGRESS_UPDATED: 'BOOK_PROGRESS_UPDATED',
};

export const eventEmitter = {
  emit: (eventName: string, data: any) => {
    DeviceEventEmitter.emit(eventName, data);
  },
  on: (eventName: string, callback: (data: any) => void) => {
    return DeviceEventEmitter.addListener(eventName, callback);
  },
};
