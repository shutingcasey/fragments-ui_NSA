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
    const fragmentsUrl = new URL('/v1/fragments?expand=1', apiUrl);
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

export async function createFragment(user, body, type) {
  logger.info('Creating fragment');

  const fragmentsUrl = new URL('/v1/fragments', apiUrl);

  const res = await fetch(fragmentsUrl, {
    method: 'POST',
    headers: {
      ...user.authorizationHeaders(),
      'Content-Type': type,
    },
    body,
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

  return {
    data,
    location,
  };
}

/**
 * Update the data for an existing fragment. The Content-Type must match the
 * fragment's original type.
 */
export async function updateFragment(user, id, body, type) {
  logger.info({ id }, 'Updating fragment');

  const fragmentUrl = new URL(`/v1/fragments/${id}`, apiUrl);

  const res = await fetch(fragmentUrl, {
    method: 'PUT',
    headers: {
      ...user.authorizationHeaders(),
      'Content-Type': type,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  logger.info({ id, data }, 'Successfully updated fragment');
  return data;
}

/**
 * Delete an existing fragment.
 */
export async function deleteFragment(user, id) {
  logger.info({ id }, 'Deleting fragment');

  const fragmentUrl = new URL(`/v1/fragments/${id}`, apiUrl);

  const res = await fetch(fragmentUrl, {
    method: 'DELETE',
    headers: user.authorizationHeaders(),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  logger.info({ id }, 'Successfully deleted fragment');
}

/**
 * Get a fragment's raw data (optionally converted to a different type by
 * passing an extension, e.g. `html`, `jpg`). Returns the Blob and the
 * Content-Type the server responded with.
 */
export async function getFragmentData(user, id, ext) {
  logger.info({ id, ext }, 'Getting fragment data');

  const path = ext ? `/v1/fragments/${id}.${ext}` : `/v1/fragments/${id}`;
  const fragmentUrl = new URL(path, apiUrl);

  const res = await fetch(fragmentUrl, {
    headers: user.authorizationHeaders(),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  const contentType = res.headers.get('Content-Type');

  logger.info({ id, ext, contentType }, 'Successfully got fragment data');

  return { blob, contentType };
}