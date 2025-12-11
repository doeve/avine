console.log('Avine Background Service Worker Started');

// Create offscreen document
async function createOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Recording from tab',
  });
}

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'START_CAPTURE') {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab[0].id });
    
    await createOffscreen();
    chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      target: 'offscreen',
      streamId
    });
  } else if (message.type === 'STOP_CAPTURE') {
    chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
      target: 'offscreen'
    });
    // Close offscreen doc to save resources? 
    // Maybe keep it open for faster subsequent starts.
  } else if (message.type === 'RECOGNITION_RESULT') {
    // Check if we should notify
    const data = await chrome.storage.local.get(['showPopups']);
    // Default to true if not set
    if (data.showPopups !== false) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png', // Ensure this exists or use a default
        title: 'Track Detected',
        message: `${message.data.title} - ${message.data.artist}`,
        priority: 1
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Avine Extension Installed');
});
