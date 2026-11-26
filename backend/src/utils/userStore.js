const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'binayakapi1';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAHoEEKgaS1v-czfe3GttDK5MHjL966_tI';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// In-memory TTL cache for fast lookups and socket presence without touching MongoDB
const USER_CACHE_TTL_MS = 60 * 1000;
const userCache = new Map();
const userCacheTime = new Map();

function setCachedUser(user) {
  if (!user || !user.id) return;
  userCache.set(user.id, user);
  userCacheTime.set(user.id, Date.now());
}

function getCachedUser(uid) {
  const key = uid?.toString();
  if (!key || !userCache.has(key)) return null;
  const cachedAt = userCacheTime.get(key) || 0;
  if (Date.now() - cachedAt < USER_CACHE_TTL_MS) {
    return userCache.get(key);
  }
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (val instanceof Date) return { stringValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(fv) {
  if (!fv || typeof fv !== 'object') return null;
  if ('nullValue' in fv) return null;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('integerValue' in fv) return Number(fv.integerValue);
  if ('doubleValue' in fv) return Number(fv.doubleValue);
  if ('timestampValue' in fv) return fv.timestampValue;
  if ('stringValue' in fv) return fv.stringValue;
  if ('arrayValue' in fv) {
    return (fv.arrayValue?.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in fv) {
    const obj = {};
    for (const [k, v] of Object.entries(fv.mapValue?.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function docToUser(doc) {
  if (!doc || !doc.fields) return null;
  const uid = doc.name ? doc.name.split('/').pop() : '';
  const data = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  return normalizeUser({ ...data, uid: data.uid || uid, id: uid, _id: uid });
}

export function normalizeUser(u) {
  if (!u) return null;
  const uid = (u.uid || u.id || u._id || '').toString();
  return {
    id: uid,
    _id: uid,
    uid,
    firebaseUid: u.firebaseUid || uid,
    name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
    email: (u.email || '').toLowerCase().trim(),
    role: u.role || 'pending',
    status: u.status || 'active',
    avatar: u.avatar || '',
    googleId: u.googleId || null,
    authProvider: u.authProvider || 'firebase',
    twoFactorEnabled: !!u.twoFactorEnabled,
    twoFactorMethod: u.twoFactorMethod || 'email',
    isOnline: !!u.isOnline,
    lastSeen: u.lastSeen || new Date().toISOString(),
    contacts: Array.isArray(u.contacts) ? u.contacts.map(String) : [],
    blockedUsers: Array.isArray(u.blockedUsers) ? u.blockedUsers.map(String) : [],
    createdAt: u.createdAt || new Date().toISOString(),
    updatedAt: u.updatedAt || new Date().toISOString()
  };
}

export function formatUser(u) {
  return normalizeUser(u);
}

function buildHeaders(idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
}

function withKey(url, idToken) {
  if (idToken) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}key=${FIREBASE_API_KEY}`;
}

export async function getUserById(uid, idToken = null) {
  if (!uid) return null;
  const targetId = uid.toString();

  const freshCached = getCachedUser(targetId);
  if (freshCached) return freshCached;

  try {
    const url = withKey(`${FIRESTORE_BASE}/users/${encodeURIComponent(targetId)}`, idToken);
    const res = await fetch(url, { headers: buildHeaders(idToken) });
    if (res.ok) {
      const doc = await res.json();
      const user = docToUser(doc);
      if (user) {
        setCachedUser(user);
        return user;
      }
    }
  } catch {
    // Fallback to stale cache if transient network issue
  }

  return userCache.get(targetId) || null;
}

export async function getUserByEmail(email, idToken = null) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const url = withKey(`${FIRESTORE_BASE}:runQuery`, idToken);
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(idToken),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'email' },
              op: 'EQUAL',
              value: { stringValue: cleanEmail }
            }
          },
          limit: 1
        }
      })
    });
    if (res.ok) {
      const rows = await res.json();
      const doc = rows.find((r) => r.document)?.document;
      if (doc) {
        const user = docToUser(doc);
        if (user) {
          setCachedUser(user);
          return user;
        }
      }
    }
  } catch {
    // Fallback to cache
  }

  for (const cached of userCache.values()) {
    if (cached.email === cleanEmail) return cached;
  }
  return null;
}

export async function getAllUsers(idToken = null) {
  const usersMap = new Map();

  try {
    const url = withKey(`${FIRESTORE_BASE}/users?pageSize=500`, idToken);
    const res = await fetch(url, { headers: buildHeaders(idToken) });
    if (res.ok) {
      const data = await res.json();
      for (const doc of data.documents || []) {
        const user = docToUser(doc);
        if (user) {
          usersMap.set(user.id, user);
          setCachedUser(user);
        }
      }
    } else {
      for (const cached of userCache.values()) {
        usersMap.set(cached.id, cached);
      }
    }
  } catch {
    for (const cached of userCache.values()) {
      usersMap.set(cached.id, cached);
    }
  }

  return Array.from(usersMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function upsertUser(uid, data, idToken = null) {
  const targetId = uid.toString();
  const existing = await getUserById(targetId, idToken);
  const now = new Date().toISOString();

  const merged = normalizeUser({
    ...(existing || {}),
    ...data,
    uid: targetId,
    id: targetId,
    _id: targetId,
    createdAt: existing?.createdAt || data.createdAt || now,
    updatedAt: now
  });

  setCachedUser(merged);

  const fields = {};
  for (const [k, v] of Object.entries(merged)) {
    if (k !== 'password') {
      fields[k] = toFirestoreValue(v);
    }
  }

  try {
    const url = withKey(`${FIRESTORE_BASE}/users/${encodeURIComponent(targetId)}`, idToken);
    await fetch(url, {
      method: 'PATCH',
      headers: buildHeaders(idToken),
      body: JSON.stringify({ fields })
    });
  } catch {
    // Fallback to in-memory cache when Firestore rules deny access
  }

  return merged;
}

export async function updateUser(uid, updates, idToken = null) {
  const targetId = uid.toString();
  const existing = await getUserById(targetId, idToken);
  if (!existing) return null;
  return upsertUser(targetId, { ...existing, ...updates }, idToken);
}

export async function deleteUser(uid, idToken = null) {
  const targetId = uid.toString();
  userCache.delete(targetId);
  userCacheTime.delete(targetId);

  try {
    const url = withKey(`${FIRESTORE_BASE}/users/${encodeURIComponent(targetId)}`, idToken);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(idToken)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getUsersMap(uids, idToken = null) {
  const uniqueIds = [...new Set((uids || []).filter(Boolean).map((id) => id.toString()))];
  const map = new Map();
  if (uniqueIds.length === 0) return map;

  await Promise.all(
    uniqueIds.map(async (id) => {
      const u = await getUserById(id, idToken);
      if (u) map.set(id, u);
    })
  );
  return map;
}

export function pickUserFields(user, fields = null) {
  if (!user) return null;
  if (!fields) return formatUser(user);
  const out = { _id: user.id, id: user.id };
  for (const f of fields) {
    if (f in user) out[f] = user[f];
  }
  return out;
}

export async function hydrateChats(chatsInput, idToken = null) {
  const isArray = Array.isArray(chatsInput);
  const chats = (isArray ? chatsInput : [chatsInput]).map((c) =>
    c && typeof c.toObject === 'function' ? c.toObject() : c
  );

  const ids = [];
  for (const c of chats) {
    if (!c) continue;
    (c.users || []).forEach((u) => ids.push(typeof u === 'object' ? u._id || u.id : u));
    if (c.groupAdmin) ids.push(typeof c.groupAdmin === 'object' ? c.groupAdmin._id || c.groupAdmin.id : c.groupAdmin);
    if (c.latestMessage?.sender) {
      const s = c.latestMessage.sender;
      ids.push(typeof s === 'object' ? s._id || s.id : s);
    }
  }

  const map = await getUsersMap(ids, idToken);

  const hydrated = chats.map((c) => {
    if (!c) return c;
    const users = (c.users || []).map((u) => {
      const uid = (typeof u === 'object' ? u._id || u.id : u)?.toString();
      return formatUser(map.get(uid)) || { _id: uid, id: uid, name: 'Unknown User', email: '' };
    });
    const groupAdminId = c.groupAdmin
      ? (typeof c.groupAdmin === 'object' ? c.groupAdmin._id || c.groupAdmin.id : c.groupAdmin)?.toString()
      : null;
    const groupAdmin = groupAdminId
      ? formatUser(map.get(groupAdminId)) || { _id: groupAdminId, id: groupAdminId, name: 'Unknown User' }
      : null;

    let latestMessage = c.latestMessage;
    if (latestMessage && latestMessage.sender) {
      const sid = (typeof latestMessage.sender === 'object'
        ? latestMessage.sender._id || latestMessage.sender.id
        : latestMessage.sender
      )?.toString();
      latestMessage = {
        ...latestMessage,
        sender: pickUserFields(map.get(sid), ['name', 'email', 'avatar', 'role']) || {
          _id: sid,
          id: sid,
          name: 'Unknown User'
        }
      };
    }

    return { ...c, users, groupAdmin, latestMessage };
  });

  return isArray ? hydrated : hydrated[0];
}

export async function hydrateMessages(messagesInput, idToken = null) {
  const isArray = Array.isArray(messagesInput);
  const messages = (isArray ? messagesInput : [messagesInput]).map((m) =>
    m && typeof m.toObject === 'function' ? m.toObject() : m
  );

  const ids = [];
  for (const m of messages) {
    if (!m) continue;
    if (m.sender) ids.push(typeof m.sender === 'object' ? m.sender._id || m.sender.id : m.sender);
    (m.reactions || []).forEach((r) => {
      if (r.user) ids.push(typeof r.user === 'object' ? r.user._id || r.user.id : r.user);
    });
    if (m.replyTo?.sender) {
      const rs = m.replyTo.sender;
      ids.push(typeof rs === 'object' ? rs._id || rs.id : rs);
    }
    if (m.chat && typeof m.chat === 'object' && Array.isArray(m.chat.users)) {
      m.chat.users.forEach((u) => ids.push(typeof u === 'object' ? u._id || u.id : u));
    }
  }

  const map = await getUsersMap(ids, idToken);

  const hydrated = messages.map((m) => {
    if (!m) return m;
    const sid = (typeof m.sender === 'object' ? m.sender._id || m.sender.id : m.sender)?.toString();
    const sender = pickUserFields(map.get(sid), ['name', 'email', 'avatar', 'role']) || {
      _id: sid,
      id: sid,
      name: 'Unknown User'
    };

    const reactions = (m.reactions || []).map((r) => {
      const ruid = (typeof r.user === 'object' ? r.user._id || r.user.id : r.user)?.toString();
      return {
        ...r,
        user: pickUserFields(map.get(ruid), ['name', 'avatar']) || { _id: ruid, id: ruid, name: 'User' }
      };
    });

    let replyTo = m.replyTo;
    if (replyTo && typeof replyTo === 'object' && replyTo.sender) {
      const rsid = (typeof replyTo.sender === 'object'
        ? replyTo.sender._id || replyTo.sender.id
        : replyTo.sender
      )?.toString();
      replyTo = {
        ...replyTo,
        sender: pickUserFields(map.get(rsid), ['name', 'email', 'avatar']) || {
          _id: rsid,
          id: rsid,
          name: 'Unknown User'
        }
      };
    }

    let chat = m.chat;
    if (chat && typeof chat === 'object' && Array.isArray(chat.users)) {
      chat = {
        ...chat,
        users: chat.users.map((u) => {
          const uid = (typeof u === 'object' ? u._id || u.id : u)?.toString();
          return pickUserFields(map.get(uid), ['name', 'email', 'avatar', 'role']) || {
            _id: uid,
            id: uid,
            name: 'Unknown User'
          };
        })
      };
    }

    return { ...m, sender, reactions, replyTo, chat };
  });

  return isArray ? hydrated : hydrated[0];
}
