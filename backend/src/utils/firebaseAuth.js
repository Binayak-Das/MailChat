import jwt from 'jsonwebtoken';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'binayakapi1';
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let certsExpiresAt = 0;

async function getFirebasePublicCerts() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiresAt) {
    return cachedCerts;
  }

  const response = await fetch(CERTS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Firebase public certificates');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600 * 1000;

  cachedCerts = await response.json();
  certsExpiresAt = now + maxAgeMs;
  return cachedCerts;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Firebase ID token');
  }

  const decodedHeader = jwt.decode(idToken, { complete: true });
  if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
    throw new Error('Invalid Firebase ID token header');
  }

  let certs = await getFirebasePublicCerts();
  let cert = certs[decodedHeader.header.kid];

  if (!cert) {
    certsExpiresAt = 0;
    certs = await getFirebasePublicCerts();
    cert = certs[decodedHeader.header.kid];
  }

  if (!cert) {
    throw new Error('Unable to find matching Firebase public key');
  }

  const payload = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  });

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Invalid Firebase token subject');
  }

  const extractedEmail =
    payload.email ||
    (Array.isArray(payload.firebase?.identities?.email)
      ? payload.firebase.identities.email[0]
      : '') ||
    '';

  return {
    uid: payload.sub,
    email: extractedEmail,
    emailVerified: !!payload.email_verified,
    name: payload.name || '',
    picture: payload.picture || '',
    signInProvider: payload.firebase?.sign_in_provider || 'password',
  };
}
