/**
 * Auth provider flags for server-side use.
 * Matches NEXT_PUBLIC_ENABLE_CLERK_AUTH from env.
 */
export const enableClerk =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_CLERK_AUTH === '1';
