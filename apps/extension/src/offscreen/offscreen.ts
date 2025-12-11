import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let processor: ScriptProcessorNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'START_RECORDING') {
    startRecording(message.streamId);
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  }
});

async function startRecording(streamId: string) {
  if (socket) return; // Already recording

  // Connect to backend
  socket = io('http://localhost:3000');
  
  socket.on('connect', () => {
    console.log('Connected to backend');
  });

  socket.on('recognition_result', (data) => {
    chrome.runtime.sendMessage({
      type: 'RECOGNITION_RESULT',
      data
    });
  });

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      } as any,
      video: false
    });

    audioContext = new AudioContext({ sampleRate: 11025 });
    source = audioContext.createMediaStreamSource(mediaStream);
    
    // Use ScriptProcessor for raw PCM access (Worklet is better but more complex setup in extension)
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (!socket || !socket.connected) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert Float32 to Int16
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      socket.emit('audio_chunk', pcmData.buffer);
    };

  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}

function stopRecording() {
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
}
