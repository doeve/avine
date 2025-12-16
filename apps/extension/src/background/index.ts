console.log('Avine Background Service Worker Started');

// Get the correct URL for the offscreen document
const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

// Create offscreen document
async function createOffscreen() {
  // Check if we already have an offscreen document
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });

  if (existingContexts.length > 0) {
    console.log('Offscreen document already exists');
    return;
  }

  console.log('Creating offscreen document...');
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Recording audio from tab for song recognition',
  });
  console.log('Offscreen document created');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  if (message.type === 'START_CAPTURE') {
    handleStartCapture().then(sendResponse).catch(err => {
      console.error('Start capture error:', err);
      sendResponse({ error: err.message });
    });
    return true; // Will respond asynchronously
  } else if (message.type === 'STOP_CAPTURE') {
    chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
      target: 'offscreen'
    });
    sendResponse({ success: true });
  } else if (message.type === 'RECOGNITION_RESULT') {
    // Forward to popup and optionally show notification
    handleRecognitionResult(message.data);
  }
  
  return false;
});

async function handleStartCapture() {
  console.log('Starting capture...');
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  
  console.log('Getting media stream ID for tab:', tab.id);
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  console.log('Got stream ID:', streamId);
  
  await createOffscreen();
  
  // Small delay to ensure offscreen is ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('Sending START_RECORDING to offscreen');
  chrome.runtime.sendMessage({
    type: 'START_RECORDING',
    target: 'offscreen',
    streamId
  });
  
  return { success: true, streamId };
}

async function handleRecognitionResult(data: any) {
  console.log('Recognition result:', data);
  
  // Check if we should show notification
  const storage = await chrome.storage.local.get(['showPopups']);
  if (storage.showPopups !== false) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon-128.png'),
      title: 'Track Detected',
      message: `${data.title} - ${data.artist}`,
      priority: 1
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Avine Extension Installed');
});
