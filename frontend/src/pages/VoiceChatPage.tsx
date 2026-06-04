import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { VoiceAgentService, ConnectionState, LogMessage } from '@/services/voiceAgentService';

// Get API key from environment
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Audio Visualizer Component
const AudioVisualizer: React.FC<{ volume: number; isActive: boolean }> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw idle circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 2;
        ctx.stroke();
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Draw active visualizer with glow
      const maxRadius = 120;
      const baseRadius = 60;
      const amplifiedVolume = Math.min(volume * 8, 1);
      const currentRadius = baseRadius + (amplifiedVolume * (maxRadius - baseRadius));

      // Outer glow rings
      for (let i = 3; i >= 0; i--) {
        const ringRadius = currentRadius + (i * 15);
        const opacity = (0.1 - (i * 0.02)) * 255;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(99, 102, 241, ${opacity / 255})`;
        ctx.fill();
      }

      // Glow gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, currentRadius);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#6366f1';
      ctx.fill();

      // Inner icon area
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [volume, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="w-full h-full max-w-[300px] max-h-[300px]"
    />
  );
};

export default function VoiceChatPage() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  
  const voiceServiceRef = useRef<VoiceAgentService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Initialize service
  useEffect(() => {
    if (!GEMINI_API_KEY) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your environment.',
      });
      return;
    }

    voiceServiceRef.current = new VoiceAgentService(GEMINI_API_KEY);
    
    voiceServiceRef.current.onVolumeUpdate = (vol) => setVolume(vol);
    voiceServiceRef.current.onLog = (text, sender) => {
      setLogs(prev => [...prev, { 
        id: Date.now().toString(), 
        text, 
        sender, 
        timestamp: new Date() 
      }]);
    };
    voiceServiceRef.current.onError = (err) => {
      setConnectionState(ConnectionState.ERROR);
      toast({
        variant: 'destructive',
        title: 'Voice Error',
        description: err,
      });
    };
    voiceServiceRef.current.onConnectionChange = (state) => {
      setConnectionState(state);
    };
    voiceServiceRef.current.onDisconnect = () => {
      setVolume(0);
    };

    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.disconnect();
      }
    };
  }, [toast]);

  // Auto-scroll logs (only within the ScrollArea, not the entire page)
  useEffect(() => {
    if (scrollRef.current) {
      // Find the ScrollArea viewport and scroll within it, not the entire page
      const scrollAreaViewport = scrollRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollAreaViewport) {
        scrollAreaViewport.scrollTo({
          top: scrollAreaViewport.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Fallback: scroll the ref into view only if it's within a scrollable container
        // Use block: 'nearest' to prevent scrolling the entire page
        scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [logs]);

  const handleConnect = async () => {
    if (!voiceServiceRef.current) return;
    
    try {
      await voiceServiceRef.current.connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!voiceServiceRef.current) return;
    await voiceServiceRef.current.disconnect();
  };

  const getConnectionLabel = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.CONNECTED:
        return 'End Call';
      case ConnectionState.ERROR:
        return 'Try Again';
      default:
        return 'Start Voice Call';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'text-green-500';
      case ConnectionState.CONNECTING:
        return 'text-yellow-500';
      case ConnectionState.ERROR:
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Voice Assistant
          </h1>
          <p className="text-muted-foreground">
            Talk naturally to book appointments and discover services
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Visualizer & Controls */}
          <div className="flex flex-col items-center gap-6">
            {/* Status */}
            <div className={cn("flex items-center gap-2 text-sm font-medium", getStatusColor())}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionState === ConnectionState.CONNECTED && "bg-green-500 animate-pulse",
                connectionState === ConnectionState.CONNECTING && "bg-yellow-500 animate-pulse",
                connectionState === ConnectionState.ERROR && "bg-red-500",
                connectionState === ConnectionState.DISCONNECTED && "bg-muted-foreground"
              )} />
              {connectionState === ConnectionState.CONNECTED ? 'Connected' : 
               connectionState === ConnectionState.CONNECTING ? 'Connecting...' :
               connectionState === ConnectionState.ERROR ? 'Error' : 'Ready'}
            </div>

            {/* Visualizer */}
            <div className="relative w-[300px] h-[300px] flex items-center justify-center bg-muted/30 rounded-full border border-border/50">
              <AudioVisualizer 
                volume={volume} 
                isActive={connectionState === ConnectionState.CONNECTED} 
              />
              {connectionState === ConnectionState.DISCONNECTED && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Mic className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              {connectionState === ConnectionState.CONNECTED && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Volume2 className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              {connectionState === ConnectionState.CONNECTED ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="destructive"
                  size="lg"
                  className="gap-2 px-8"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </Button>
              ) : (
                <Button 
                  onClick={handleConnect}
                  disabled={connectionState === ConnectionState.CONNECTING}
                  size="lg"
                  className="gap-2 px-8"
                >
                  <Phone className="w-5 h-5" />
                  {getConnectionLabel()}
                </Button>
              )}
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-muted-foreground max-w-xs">
              {connectionState === ConnectionState.DISCONNECTED ? (
                <p>Click "Start Voice Call" to begin speaking with the AI assistant</p>
              ) : connectionState === ConnectionState.CONNECTED ? (
                <p>Speak naturally. The assistant will help you find and book services.</p>
              ) : (
                <p>Please wait...</p>
              )}
            </div>
          </div>

          {/* Right: Activity Log */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
            <div className="flex-1 bg-muted/30 rounded-lg border border-border/50 p-4 min-h-[300px] max-h-[400px]">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {logs.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Activity will appear here once you start a call
                      </p>
                    ) : (
                      logs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "text-sm p-2 rounded",
                            log.sender === 'system' && "bg-muted text-muted-foreground",
                            log.sender === 'ai' && "bg-primary/10 text-foreground",
                            log.sender === 'tool' && "bg-green-500/10 text-green-600 dark:text-green-400",
                            log.sender === 'user' && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          <span className="font-medium capitalize mr-2">
                            [{log.sender}]
                          </span>
                          {log.text}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Clear Log */}
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 self-end"
                onClick={() => setLogs([])}
              >
                Clear Log
              </Button>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/50">
          <h4 className="font-semibold mb-2">💡 Tips for best experience:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Wait for the assistant to finish speaking before responding</li>
            <li>• Say things like "What services do you have?" or "I want to book a slot"</li>
            <li>• Confirm bookings by saying "Yes, book it" or "Confirm"</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
