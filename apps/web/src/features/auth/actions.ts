import { createAction } from '@reduxjs/toolkit';

/** Dispatched on logout and when the session can no longer be refreshed. */
export const loggedOut = createAction('auth/loggedOut');
