/**
 * useRealTimeRecognition - Hook for managing WebSocket connection to audio recognition
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

interface RecognitionResult {
  title: string;
  artist: string;
  confidence: number;
  votes?: number;
}

interface TrackHistoryItem {
  title: string;
  artist: string;
  timestamp: number;
}

interface RecognitionStatus {
  status: 'connected' | 'listening' | 'recognized' | 'disconnected' | 'error';
  message?: string;
}

export function useRealTimeRecognition() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<RecognitionStatus>({ status: 'disconnected' });
  const [currentTrack, setCurrentTrack] = useState<RecognitionResult | null>(null);
  const [trackHistory, setTrackHistory] = useState<TrackHistoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to recognition service');
      setConnected(true);
      setStatus({ status: 'connected', message: 'Ready to capture audio' });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from recognition service');
      setConnected(false);
      setStatus({ status: 'disconnected' });
    });

    newSocket.on('recognition_result', (result: RecognitionResult) => {
      setCurrentTrack(result);
      setStatus({ status: 'recognized', message: `${result.artist} - ${result.title}` });
    });

    newSocket.on('new_track', (track: TrackHistoryItem) => {
      setTrackHistory(prev => [...prev, track]);
    });

    newSocket.on('recognition_status', (data: { status: string; message: string }) => {
      setStatus({ status: 'listening', message: data.message });
    });

    newSocket.on('track_history', (history: TrackHistoryItem[]) => {
      setTrackHistory(history);
    });

    setSocket(newSocket);

    return newSocket;
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setConnected(false);
    setStatus({ status: 'disconnected' });
  }, [socket]);

  // Start capturing audio from microphone
  const startRecording = useCallback(async () => {
    if (!socket || !connected) {
      console.error('Not connected to server');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Create processor for downsampling to 11025Hz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let sampleBuffer: number[] = [];
      const TARGET_SAMPLE_RATE = 11025;
      const downsampleRatio = audioContext.sampleRate / TARGET_SAMPLE_RATE;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Downsample
        for (let i = 0; i < inputData.length; i += downsampleRatio) {
          const idx = Math.floor(i);
          if (idx < inputData.length) {
            sampleBuffer.push(inputData[idx]);
          }
        }

        // Send chunks every ~0.5s (5512 samples at 11025Hz)
        if (sampleBuffer.length >= 5512) {
          const samples = sampleBuffer.splice(0, 5512);
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(samples.length);
          for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          socket.emit('audio_chunk', pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setStatus({ status: 'listening', message: 'Capturing audio...' });
      
      // Request existing history
      socket.emit('get_history');

    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus({ status: 'error', message: 'Failed to access microphone' });
    }
  }, [socket, connected]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setStatus({ status: 'connected', message: 'Recording stopped' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
    };
  }, [stopRecording, disconnect]);

  return {
    connected,
    status,
    currentTrack,
    trackHistory,
    isRecording,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearHistory: () => setTrackHistory([]),
  };
}
