import { type SSOProvider } from '@lobechat/types';

import { type LobeUser } from '@/types/user';

export interface UserAuthState {
  authProviders?: SSOProvider[];
  /**
   * Whether user registered with email/password (credential login)
   */
  hasPasswordAccount?: boolean;
  clerkOpenUserProfile?: (props?: UserProfileProps) => void;

  clerkSession?: SignedInSessionResource;
  clerkSignIn?: (props?: SignInProps) => void;
  clerkSignOut?: SignOut;
  clerkUser?: UserResource;
  isAdmin?: boolean;
  isLoaded?: boolean;
  isLoadedAuthProviders?: boolean;

  isSignedIn?: boolean;
  oAuthSSOProviders?: string[];
  user?: LobeUser;
}

export const initialAuthState: UserAuthState = {
  isAdmin: false,
};
