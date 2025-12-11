console.log('Avine Content Script Loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCAN_MEDIA') {
    handleScanMedia(sendResponse);
    return true; // async response
  }
});

function handleScanMedia(sendResponse: (response: any) => void) {
  const media = document.querySelector('video, audio') as HTMLMediaElement;
  
  if (!media) {
    sendResponse({ found: false });
    return;
  }

  // Detect Platform
  let platform = 'Unknown';
  if (window.location.hostname.includes('youtube.com')) platform = 'YouTube';
  else if (window.location.hostname.includes('soundcloud.com')) platform = 'SoundCloud';
  else if (window.location.hostname.includes('spotify.com')) platform = 'Spotify';

  // Get Metadata
  // Best effort title extraction
  let title = document.title;
  let artist = '';
  let tracks: any[] = [];
  
  if (platform === 'YouTube') {
    // Try to get video title specifically
    const ytTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;
    if (ytTitle) title = ytTitle.trim();
    
    // Try to get channel name as artist
    const ytChannel = document.querySelector('ytd-channel-name a')?.textContent;
    if (ytChannel) artist = ytChannel.trim();

    // Try to parse description for tracklist
    const description = document.querySelector('#description-inline-expander .ytd-text-inline-expander')?.textContent || 
                        document.querySelector('#description .ytd-video-secondary-info-renderer')?.textContent;
    
    if (description) {
      // Regex for "00:00 Track Name" or "Track Name 00:00"
      // Simple match for lines containing timestamp
      const lines = description.split('\n');
      const timeRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/;

      tracks = lines.map(line => {
        const match = line.match(timeRegex);
        if (match) {
           const timestamp = match[0];
           // Remove timestamp from line to get title
           const cleanTitle = line.replace(timestamp, '').trim().replace(/^[-–—]\s*/, '').replace(/\s*[-–—]$/, '');
           return {
             timestampStr: timestamp,
             title: cleanTitle,
             artist: artist // default to channel artist if not parsed
           };
        }
        return null;
      }).filter(Boolean);
    }
  }

  sendResponse({
    found: true,
    platform,
    title,
    artist: artist || 'Unknown Artist',
    duration: media.duration,
    currentTime: media.currentTime,
    src: media.src,
    url: window.location.href,
    tracks
  });
}
