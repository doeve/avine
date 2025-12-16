import { io, Socket } from 'socket.io-client';

console.log('Offscreen script loaded');

let socket: Socket | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let processor: ScriptProcessorNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  console.log('Offscreen received message:', message.type, message.target);
  
  if (message.target !== 'offscreen') return;

  if (message.type === 'START_RECORDING') {
    console.log('Starting recording with streamId:', message.streamId);
    startRecording(message.streamId);
  } else if (message.type === 'STOP_RECORDING') {
    console.log('Stopping recording');
    stopRecording();
  }
});

async function startRecording(streamId: string) {
  if (socket) {
    console.log('Already recording, ignoring');
    return;
  }

  console.log('Connecting to backend WebSocket...');
  
  // Connect to backend
  socket = io('http://localhost:3000', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to backend WebSocket, socket id:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('recognition_result', (data) => {
    console.log('🎵 Recognition result received:', data);
    chrome.runtime.sendMessage({
      type: 'RECOGNITION_RESULT',
      data
    });
  });

  socket.on('recognition_status', (data) => {
    console.log('Recognition status:', data);
  });

  socket.on('new_track', (data) => {
    console.log('🎵 New track detected:', data);
    chrome.runtime.sendMessage({
      type: 'RECOGNITION_RESULT',
      data
    });
  });

  try {
    console.log('Requesting tab audio with streamId:', streamId);
    
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      } as any,
      video: false
    });
    
    console.log('✅ Got MediaStream:', mediaStream.id, 'Active:', mediaStream.active);
    console.log('Audio tracks:', mediaStream.getAudioTracks().map(t => ({
      id: t.id,
      label: t.label,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    })));

    // Play the captured audio back so the tab isn't muted
    // This creates an audio element that plays the stream while we process it
    const audioPlayback = new Audio();
    audioPlayback.srcObject = mediaStream;
    audioPlayback.volume = 1.0;
    audioPlayback.play().catch(err => console.warn('Audio playback error:', err));
    console.log('✅ Audio playback started to prevent tab muting');

    // Create audio context at 11025 Hz (what the backend expects)
    audioContext = new AudioContext({ sampleRate: 11025 });
    console.log('AudioContext state:', audioContext.state, 'sampleRate:', audioContext.sampleRate);
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('AudioContext resumed');
    }

    source = audioContext.createMediaStreamSource(mediaStream);
    
    // ScriptProcessor for raw PCM access
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    let chunksSent = 0;
    let lastLogTime = Date.now();
    
    processor.onaudioprocess = (e) => {
      if (!socket || !socket.connected) {
        if (chunksSent < 3) console.log('Socket not connected, skipping chunk');
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Log periodically
      if (Date.now() - lastLogTime > 5000) {
        const maxVal = Math.max(...Array.from(inputData).map(Math.abs));
        console.log(`Audio stats: chunks sent=${chunksSent}, max amplitude=${maxVal.toFixed(4)}, socket connected=${socket.connected}`);
        lastLogTime = Date.now();
      }

      // Convert Float32 to Int16
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      socket.emit('audio_chunk', pcmData.buffer);
      chunksSent++;
      
      if (chunksSent === 1) {
        console.log('✅ First audio chunk sent to backend');
      }
    };
    
    console.log('✅ Audio processing pipeline started');

  } catch (error) {
    console.error('❌ Failed to start recording:', error);
  }
}

function stopRecording() {
  console.log('Stopping recording...');
  
  if (processor) {
    processor.disconnect();
    processor.onaudioprocess = null;
    processor = null;
  }
  if (source) {
    source.disconnect();
    source = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  console.log('Recording stopped');
}
