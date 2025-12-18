/**
 * Extension API Module
 * 
 * Handles API calls to the Avine backend with auth.
 */

import { getAuthHeader } from './auth';

const API_BASE = 'http://localhost:3000/api';

interface CreateSessionResponse {
  id: string;
  status: string;
}

/**
 * Create a new session for extension listening
 */
export async function createExtensionSession(): Promise<CreateSessionResponse | null> {
  try {
    const headers = await getAuthHeader();
    
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        sourceType: 'BROWSER_EXTENSION',
      }),
    });

    if (!response.ok) {
      console.error('Failed to create session:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Add a detected track to a session
 */
export async function addTrackToSession(
  sessionId: string,
  track: {
    title: string;
    artist: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }
): Promise<boolean> {
  try {
    const headers = await getAuthHeader();
    
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(track),
    });

    return response.ok;
  } catch (error) {
    console.error('Error adding track:', error);
    return false;
  }
}

/**
 * Complete a session
 */
export async function completeSession(sessionId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeader();
    
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error completing session:', error);
    return false;
  }
}
