/**
 * Extension Auth Module
 * 
 * Handles authentication sync between the web app and extension.
 * Strategy: Extension reads auth from web app's localStorage via content script.
 */

const WEB_APP_ORIGIN = 'http://localhost:5173'; // Dev - update for production
const EXTENSION_AUTH_KEY = 'avine-extension-auth';

export interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string; displayName: string } | null;
  isAuthenticated: boolean;
}

/**
 * Get current auth state from extension storage
 */
export async function getAuthState(): Promise<AuthState> {
  const result = await chrome.storage.local.get([EXTENSION_AUTH_KEY]);
  const data = result[EXTENSION_AUTH_KEY] as { accessToken?: string; user?: AuthState['user'] } | undefined;
  
  if (data && data.accessToken) {
    return {
      accessToken: data.accessToken,
      user: data.user || null,
      isAuthenticated: true,
    };
  }
  
  return { accessToken: null, user: null, isAuthenticated: false };
}

/**
 * Save auth state to extension storage
 */
export async function setAuthState(state: AuthState): Promise<void> {
  if (state.isAuthenticated) {
    await chrome.storage.local.set({
      [EXTENSION_AUTH_KEY]: {
        accessToken: state.accessToken,
        user: state.user,
      },
    });
  } else {
    await chrome.storage.local.remove(EXTENSION_AUTH_KEY);
  }
}

/**
 * Clear auth state (logout)
 */
export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove(EXTENSION_AUTH_KEY);
}

/**
 * Open web app login page
 */
export function openWebLogin(): void {
  chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/login?from=extension` });
}

/**
 * Try to sync auth from web app
 * This uses a content script to read localStorage from the web app
 */
export async function syncAuthFromWeb(): Promise<AuthState> {
  try {
    // Find any open tab with the web app
    const tabs = await chrome.tabs.query({ url: `${WEB_APP_ORIGIN}/*` });
    
    if (tabs.length === 0) {
      // No web app tab open, can't sync
      return { accessToken: null, user: null, isAuthenticated: false };
    }

    const tabId = tabs[0].id;
    if (!tabId) return { accessToken: null, user: null, isAuthenticated: false };

    // Execute script in web app context to read localStorage
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const authData = localStorage.getItem('avine-auth');
        return authData;
      },
    });

    if (results && results[0]?.result) {
      const parsed = JSON.parse(results[0].result);
      if (parsed.state?.accessToken) {
        const authState: AuthState = {
          accessToken: parsed.state.accessToken,
          user: parsed.state.user,
          isAuthenticated: true,
        };
        // Save to extension storage
        await setAuthState(authState);
        return authState;
      }
    }
  } catch (error) {
    console.error('Failed to sync auth from web:', error);
  }

  return { accessToken: null, user: null, isAuthenticated: false };
}

/**
 * Get auth header for API calls
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const state = await getAuthState();
  if (state.accessToken) {
    return { Authorization: `Bearer ${state.accessToken}` };
  }
  return {};
}
