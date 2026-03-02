import { useUserStore } from '@/store/user';

/**
 * Hook to check if the current user has admin privileges
 * @returns boolean indicating if the user is an admin
 */
export const useIsAdmin = (): boolean => {
  const isAdmin = useUserStore((s) => s.isAdmin);
  return isAdmin ?? false;
};
