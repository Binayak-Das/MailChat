export function isPushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission() {
  if (!isPushSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function sendDesktopNotification(title, options = {}) {
  if (!isPushSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  // Respect user preference unless explicitly forced (e.g., test notification)
  if (!options.force) {
    const pref = typeof localStorage !== 'undefined' ? localStorage.getItem('mailchat_pref_push_notifications') : null;
    if (pref === 'false') return null;
  }

  try {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const defaultIcon = origin ? `${origin}/notification-icon.png` : '/notification-icon.png';

    const notifOptions = {
      icon: options.icon || defaultIcon,
      badge: options.badge || defaultIcon,
      body: options.body || '',
      tag: options.tag || undefined,
      silent: options.silent || false,
      requireInteraction: options.requireInteraction ?? false
    };

    const notification = new Notification(title, notifOptions);

    if (options.onClick) {
      notification.onclick = (e) => {
        try {
          window.focus();
        } catch {}
        options.onClick(e);
        notification.close();
      };
    } else {
      notification.onclick = () => {
        try {
          window.focus();
        } catch {}
        notification.close();
      };
    }

    return notification;
  } catch (err) {
    console.error('Error sending desktop notification:', err);
    return null;
  }
}
