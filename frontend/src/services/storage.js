
const COOKIE_CONSENT_KEY = 'mailchat_cookie_consent';
const ESSENTIAL_KEYS = ['mailchat_token', 'mailchat_user', COOKIE_CONSENT_KEY];

export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const rawValue = c.substring(nameEQ.length, c.length);
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return null;
}

export function setCookie(name, value, days = 30, options = {}) {
  if (typeof document === 'undefined') return;

  let expires = '';
  if (days && days > 0) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }

  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  const sameSite = options.sameSite || 'Lax';
  const path = options.path || '/';

  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(stringValue)}${expires}; path=${path}; SameSite=${sameSite}${secureFlag}`;
}

export function removeCookie(name, options = {}) {
  if (typeof document === 'undefined') return;
  const path = options.path || '/';
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax`;
}

export function getAllCookies() {
  if (typeof document === 'undefined') return {};
  const cookies = {};
  const pairs = document.cookie.split(';');
  for (let pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const splitIdx = trimmed.indexOf('=');
    if (splitIdx > -1) {
      const k = decodeURIComponent(trimmed.slice(0, splitIdx));
      const v = decodeURIComponent(trimmed.slice(splitIdx + 1));
      cookies[k] = v;
    }
  }
  return cookies;
}

export function getCookieConsent() {
  return getCookie(COOKIE_CONSENT_KEY);
}

export function hasAnsweredCookieConsent() {
  const consent = getCookieConsent();
  return consent !== null && consent !== undefined && consent !== '';
}

export function arePreferenceCookiesAllowed() {
  const consent = getCookieConsent();
  return consent === 'accepted';
}

export function setCookieConsent(status, preferences = {}) {
  setCookie(COOKIE_CONSENT_KEY, status, 365);

  if (status === 'accepted') {

    if (preferences.theme) {
      setCookie('mailchat_theme', preferences.theme, 365);
    }
  } else if (status === 'declined') {

    removeCookie('mailchat_pref_audio_alerts');
    removeCookie('mailchat_pref_push_notifications');
    removeCookie('mailchat_pref_email_notifications');
    removeCookie('mailchat_pref_admin_priority_alerts');
  }

  migrateAndPurgeLocalStorage();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mailchat_cookie_consent_changed', { detail: { status, preferences } }));
  }
}

export function revokeCookieConsent() {
  removeCookie(COOKIE_CONSENT_KEY);
  removeCookie('mailchat_pref_audio_alerts');
  removeCookie('mailchat_pref_push_notifications');
  removeCookie('mailchat_pref_email_notifications');
  removeCookie('mailchat_pref_admin_priority_alerts');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mailchat_cookie_consent_changed', { detail: { status: null } }));
  }
}

export function migrateAndPurgeLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToMigrate = [
      'mailchat_token',
      'mailchat_user',
      'mailchat_theme',
      'mailchat_pref_audio_alerts',
      'mailchat_pref_push_notifications',
      'mailchat_pref_email_notifications',
      'mailchat_pref_admin_priority_alerts'
    ];

    keysToMigrate.forEach((key) => {
      const val = window.localStorage.getItem(key);
      if (val !== null && val !== undefined) {

        if (!getCookie(key)) {
          const days = key.includes('theme') || key.includes('pref') ? 365 : 30;
          setCookie(key, val, days);
        }
        window.localStorage.removeItem(key);
      }
    });

    window.localStorage.clear();
  } catch (err) {
    console.warn('LocalStorage migration warning:', err);
  }
}

export const cookieStorage = {
  getItem(key) {
    return getCookie(key);
  },

  setItem(key, value) {
    const isEssential = ESSENTIAL_KEYS.includes(key);
    const consent = getCookieConsent();

    if (isEssential || consent === 'accepted' || consent === null) {
      const days = key.includes('theme') || key.includes('pref') ? 365 : 30;
      setCookie(key, value, days);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  },

  removeItem(key) {
    removeCookie(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  },

  clear() {
    const cookies = getAllCookies();
    Object.keys(cookies).forEach((key) => {
      if (key.startsWith('mailchat_')) {
        removeCookie(key);
      }
    });
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
      } catch {}
    }
  }
};

if (typeof window !== 'undefined') {
  migrateAndPurgeLocalStorage();
}

export default cookieStorage;
