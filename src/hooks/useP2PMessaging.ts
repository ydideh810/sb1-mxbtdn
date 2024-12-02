import { useState, useCallback, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { Message, KeyPair } from '../types/message';
import { generateKeyPair, encryptMessage, decryptMessage } from '../utils/cryptoUtils';
import { notificationService } from '../services/notificationService';

const MESSAGES_STORE_KEY = 'saxiib_messages';
const KEYPAIR_STORE_KEY = 'saxiib_keypair';

export function useP2PMessaging() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);

  useEffect(() => {
    loadKeyPair();
    loadMessages();
  }, []);

  const loadKeyPair = async () => {
    try {
      let storedKeyPair = await get(KEYPAIR_STORE_KEY);
      if (!storedKeyPair) {
        storedKeyPair = generateKeyPair();
        await set(KEYPAIR_STORE_KEY, storedKeyPair);
      }
      setKeyPair(storedKeyPair);
    } catch (error) {
      console.error('Failed to load keypair:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const stored = await get(MESSAGES_STORE_KEY) || [];
      setMessages(stored);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = useCallback(async (
    content: string,
    recipientPublicKey: string
  ): Promise<Message | null> => {
    if (!keyPair) return null;

    try {
      const { encrypted, nonce } = encryptMessage(
        content,
        recipientPublicKey,
        keyPair.secretKey
      );

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: keyPair.publicKey,
        receiverId: recipientPublicKey,
        content: encrypted,
        nonce,
        timestamp: new Date(),
        status: 'sent',
        type: 'text'
      };

      const updatedMessages = [...messages, message];
      await set(MESSAGES_STORE_KEY, updatedMessages);
      setMessages(updatedMessages);

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }, [keyPair, messages]);

  const sendMediaMessage = useCallback(async (
    base64Data: string,
    type: 'image' | 'video' | 'voice',
    recipientPublicKey: string
  ): Promise<Message | null> => {
    if (!keyPair) return null;

    try {
      const { encrypted, nonce } = encryptMessage(
        base64Data,
        recipientPublicKey,
        keyPair.secretKey
      );

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: keyPair.publicKey,
        receiverId: recipientPublicKey,
        content: encrypted,
        nonce,
        timestamp: new Date(),
        status: 'sent',
        type
      };

      const updatedMessages = [...messages, message];
      await set(MESSAGES_STORE_KEY, updatedMessages);
      setMessages(updatedMessages);

      return message;
    } catch (error) {
      console.error('Failed to send media message:', error);
      return null;
    }
  }, [keyPair, messages]);

  const receiveMessage = useCallback(async (message: Message) => {
    if (!keyPair) return;

    try {
      const decrypted = decryptMessage(
        message.content,
        message.nonce!,
        message.senderId,
        keyPair.secretKey
      );

      // Show notification
      if (document.visibilityState !== 'visible') {
        notificationService.notifyNewMessage(message.senderId, decrypted);
      }

      const updatedMessages = [...messages, { ...message, content: decrypted }];
      await set(MESSAGES_STORE_KEY, updatedMessages);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Failed to receive message:', error);
    }
  }, [keyPair, messages]);

  return {
    keyPair,
    messages,
    sendMessage,
    sendMediaMessage,
    receiveMessage
  };
}