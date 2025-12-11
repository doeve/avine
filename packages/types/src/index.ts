export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: 'FREE' | 'PRO' | 'UNLIMITED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  isrc?: string;
  releaseYear?: number;
  confidence: number;
  startTime: number; // in seconds relative to source
  endTime: number; // in seconds relative to source
}

export interface Session {
  id: string;
  userId: string;
  sourceType: 'BROWSER_TAB' | 'FILE_UPLOAD' | 'URL';
  sourceUrl?: string; // URL or filename
  createdAt: Date;
  duration: number; // total analysis duration
  tracks: Track[];
}

export interface AnalysisResult {
  sessionId: string;
  tracks: Track[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
}
