/**
 * Voice Agent Service - Gemini Live API Integration
 * ==================================================
 * Real-time voice-to-voice conversation using Google Gemini 2.5 Flash Native Audio.
 * All service context is embedded in the system prompt, with only one booking tool.
 */

import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import api from '@/lib/api';

// Type declarations for Gemini Blob
interface GeminiBlob {
  data: string;
  mimeType: string;
}

// --- Audio Utilities ---

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createPcmBlob(data: Float32Array): GeminiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    int16[i] = sample * 32768;
  }
  return {
    data: encodeBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Connection State ---

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface LogMessage {
  id: string;
  sender: 'user' | 'system' | 'ai' | 'tool';
  text: string;
  timestamp: Date;
}

// --- Book Slot Tool ---

const bookSlotTool: FunctionDeclaration = {
  name: 'bookSlot',
  description: 'Books a specific time slot for the user. Use this ONLY when the user explicitly confirms they want to book. Requires the exact slot ID.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      slotId: {
        type: Type.STRING,
        description: 'The exact slot ID from the available slots data',
      },
    },
    required: ['slotId'],
  },
};

// --- Voice Agent Service Class ---

export class VoiceAgentService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  
  private nextStartTime: number = 0;
  private isConnected: boolean = false;
  private systemPrompt: string = '';
  
  // Callbacks for UI updates
  public onVolumeUpdate: (volume: number) => void = () => {};
  public onLog: (text: string, sender: 'user' | 'system' | 'ai' | 'tool') => void = () => {};
  public onError: (error: string) => void = () => {};
  public onDisconnect: () => void = () => {};
  public onConnectionChange: (state: ConnectionState) => void = () => {};

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Fetch context from backend and build the system prompt
   */
  private async buildSystemPrompt(): Promise<string> {
    try {
      const response = await api.get('/voice/context');
      const { services, bookingCount, todayStr } = response.data.data;

      return `You are Bookify Assistant, a friendly voice assistant for booking appointments.

TODAY: ${todayStr}

SERVICES & SLOTS:
${services}

User has ${bookingCount} previous bookings.

RULES:
- Keep responses SHORT (this is voice, not text)
- Be friendly and natural
- When user wants to book, confirm service, date, time first
- Only call bookSlot after user confirms
- Book exactly ONE slot per request
- Use the slot ID in brackets [id] when booking`;
    } catch (error) {
      console.error('Failed to fetch context:', error);
      return `You are Bookify Assistant. I couldn't load services right now. Please try again later.`;
    }
  }

  /**
   * Execute the booking via backend API
   */
  private async executeBookSlot(slotId: string): Promise<string> {
    try {
      const response = await api.post('/voice/book', { slotId });
      const data = response.data.data;
      
      if (data.success) {
        return JSON.stringify({
          status: 'success',
          message: `Booking confirmed! ${data.service} on ${data.date} at ${data.time} for ${data.amount}. Payment is cash on arrival.`,
          bookingId: data.bookingId,
        });
      } else {
        return JSON.stringify({
          status: 'error',
          message: data.error || 'Failed to book. Please try another slot.',
        });
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      return JSON.stringify({
        status: 'error',
        message: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    }
  }

  async connect() {
    if (this.isConnected) return;

    try {
      this.onConnectionChange(ConnectionState.CONNECTING);
      this.onLog("Loading service data...", 'system');
      
      // Build system prompt with context from backend
      this.systemPrompt = await this.buildSystemPrompt();
      
      this.onLog("Initializing audio...", 'system');
      
      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);
      
      this.nextStartTime = this.outputAudioContext.currentTime;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.onLog("Connecting to voice service...", 'system');

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: this.systemPrompt,
          tools: [{ functionDeclarations: [bookSlotTool] }],
        },
        callbacks: {
          onopen: () => {
            this.onLog("Connected! You can start speaking.", 'system');
            this.isConnected = true;
            this.onConnectionChange(ConnectionState.CONNECTED);
            this.startInputStreaming(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            await this.handleMessage(message, sessionPromise);
          },
          onclose: (event: any) => {
            console.log('Session closed:', event);
            this.onLog("Session ended.", 'system');
            this.cleanup();
          },
          onerror: (err: any) => {
            console.error('Gemini Live error:', err);
            this.onLog(`Error: ${err?.message || err}`, 'system');
            this.onError(err?.message || "Connection error occurred.");
            this.cleanup();
          },
        },
      });

    } catch (error: any) {
      this.onError(error.message || "Failed to connect");
      this.cleanup();
    }
  }

  private startInputStreaming(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeUpdate(rms);

      // Create blob and send
      const pcmBlob = createPcmBlob(inputData);
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // 1. Handle Tool Calls
    if (message.toolCall && message.toolCall.functionCalls) {
      for (const fc of message.toolCall.functionCalls) {
        this.onLog(`Calling tool: ${fc.name}`, 'tool');
        
        let result = "";
        const args = fc.args as any;

        if (fc.name === 'bookSlot') {
          result = await this.executeBookSlot(args.slotId);
        }

        this.onLog(`Tool result: ${JSON.parse(result).message}`, 'tool');

        // Send response back to Gemini (matching source project pattern)
        const session = await sessionPromise;
        session.sendToolResponse({
          functionResponses: {
            id: fc.id,
            name: fc.name,
            response: { result: result }
          }
        });
      }
    }

    // 2. Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      // Decode and play
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext, 24000);
      
      // Schedule playback - ensure we don't schedule in the past
      this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.start(this.nextStartTime);
      
      this.nextStartTime += audioBuffer.duration;
    }

    // 3. Handle Interruption (User spoke while model was speaking)
    if (message.serverContent?.interrupted) {
      this.onLog("Model interrupted", 'system');
      if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
      }
    }
  }

  async disconnect() {
    this.cleanup();
  }

  private cleanup() {
    this.isConnected = false;
    
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    
    this.onConnectionChange(ConnectionState.DISCONNECTED);
    this.onDisconnect();
  }
}
