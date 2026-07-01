// src/api.js

import logger from './logger';

// fragments microservice API to use, defaults to localhost:8080 if not set in env
const apiUrl = process.env.API_URL || 'http://localhost:8080';

/**
 * Given an authenticated user, request all fragments for this user from the
 * fragments microservice (currently only running locally). We expect a user
 * to have an `idToken` attached, so we can send that along with the request.
 */
export async function getUserFragments(user) {
  logger.info('Requesting user fragments data');
  try {
    const fragmentsUrl = new URL('/v1/fragments', apiUrl);
    const res = await fetch(fragmentsUrl, {
      // Generate headers with the proper Authorization bearer token to pass.
      // We are using the `authorizationHeaders()` helper method we defined
      // earlier, to automatically attach the user's ID token.
      headers: user.authorizationHeaders(),
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    logger.info({ data }, 'Successfully got user fragments data');
    return data;
  } catch (err) {
    logger.error({ err }, 'Unable to call GET /v1/fragments');
  }
}

export async function createFragment(user, text) {
  logger.info('Creating fragment');

  const fragmentsUrl = new URL('/v1/fragments', apiUrl);

  const res = await fetch(fragmentsUrl, {
    method: 'POST',
    headers: {
      ...user.authorizationHeaders(),
      'Content-Type': 'text/plain',
    },
    body: text,
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const location = res.headers.get('Location');

  logger.info(
    {
      data,
      location,
    },
    'Successfully created fragment'
  );

  return data;
}