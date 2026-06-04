/**
 * IVR Module Types
 * ================
 * TypeScript types for the IVR (Interactive Voice Response) system
 * using Twilio Media Streams and Gemini Live API.
 */

import type { WebSocket } from 'ws';

// ============================================
// CONVERSATION TYPES
// ============================================

export interface BookingIntent {
  serviceId?: string;
  date?: string;         // YYYY-MM-DD format
  time?: string;         // HH:mm format or natural language
  userName?: string;
  confirmed?: boolean;
}

export interface ConversationState {
  callSid: string;
  from: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  bookingIntent: BookingIntent;
  createdAt: Date;
  lastActivityAt: Date;
}

// ============================================
// GEMINI LIVE SESSION TYPES
// ============================================

export interface GeminiLiveSession {
  callSid: string;
  conversationHistory: Array<{
    role: 'user' | 'model';
    parts: Array<{ text?: string }>;
  }>;
  bookingIntent: BookingIntent;
}

// ============================================
// MEDIA STREAM CONNECTION TYPES
// ============================================

export interface MediaStreamConnection {
  ws: WebSocket;
  callSid: string;
  streamSid: string;
  from: string;
  geminiSession: any; // Gemini Live API session
  audioBuffer: Buffer;
  audioQueueOutput: Buffer[];
  isGeminiConnected: boolean;
  isStreamReady: boolean;
  playbackInterval: NodeJS.Timer | null;
  mulawBuffer: Buffer;
  sequenceNumber: number;
  lastAudioTimestamp: number;
  audioFlushTimeout: NodeJS.Timeout | null;
  lastAudioReceivedTime: number;
  lastAudioSentTime: number;
  lastUserSpeechEndTime: number;
  _audioReceivedCount?: number;
  _audioSentCount?: number;
  _chunkCount?: number;
}

// ============================================
// SERVICE TYPES FOR IVR
// ============================================

export interface ServiceForIVR {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  address?: string | null;
  city?: string | null;
}

export interface SlotForIVR {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'HOLD' | 'BOOKED';
}

// ============================================
// BOOKING RESULT TYPES
// ============================================

export interface IVRBookingResult {
  success: boolean;
  message?: string;
  error?: string;
  bookingId?: string;
}

// ============================================
// TWILIO WEBHOOK TYPES
// ============================================

export interface TwilioWebhookPayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  ApiVersion: string;
  Direction: string;
  ForwardedFrom?: string;
  CallerName?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
}

export interface TwilioGatherPayload extends TwilioWebhookPayload {
  SpeechResult?: string;
  Digits?: string;
  Confidence?: string;
}

export interface TwilioMediaStreamMessage {
  event: 'connected' | 'start' | 'media' | 'stop';
  sequenceNumber?: string;
  protocol?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks?: string[];
    customParameters?: Record<string, string>;
    mediaFormat?: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track?: string;
    chunk?: string;
    timestamp?: string;
    payload?: string;
  };
  streamSid?: string;
}

