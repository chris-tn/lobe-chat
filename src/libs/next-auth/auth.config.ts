import type { NextAuthConfig } from 'next-auth';

import { getServerDBConfig } from '@/config/db';
import { getAuthConfig } from '@/envs/auth';

import { LobeNextAuthDbAdapter } from './adapter';
import { ssoProviders } from './sso-providers';

const {
  NEXT_AUTH_DEBUG,
  NEXT_AUTH_SECRET,
  NEXT_AUTH_SSO_SESSION_STRATEGY,
  NEXT_AUTH_SSO_PROVIDERS,
  NEXT_PUBLIC_ENABLE_NEXT_AUTH,
} = getAuthConfig();

const { NEXT_PUBLIC_ENABLED_SERVER_SERVICE } = getServerDBConfig();

export const initSSOProviders = () => {
  return NEXT_PUBLIC_ENABLE_NEXT_AUTH
    ? NEXT_AUTH_SSO_PROVIDERS.split(/[,，]/).map((provider) => {
      const validProvider = ssoProviders.find((item) => item.id === provider.trim());

      if (validProvider) return validProvider.provider;

      throw new Error(`[NextAuth] provider ${provider} is not supported`);
    })
    : [];
};

// Notice this is only an object, not a full Auth.js instance
export default {
  adapter: NEXT_PUBLIC_ENABLED_SERVER_SERVICE ? LobeNextAuthDbAdapter() : undefined,
  callbacks: {
    // Note: Data processing order of callback: authorize --> jwt --> session
    async jwt({ token, user, profile }) {
      // Debug: Log JWT payload to see what Casdoor returns
      // console.log('=== [JWT Callback] ===');
      // console.log('token:', token);
      // console.log('user:', user);
      // console.log('account:', account);
      // console.log('profile:', profile);
      // console.log('=====================');

      // ref: https://authjs.dev/guides/extending-the-session#with-jwt
      if (user?.id) {
        token.userId = user?.id;
      }

      // Extract isAdmin from multiple sources (priority order matters!)
      let isAdmin = false;

      // For INITIAL login (when profile/user exists)
      if (profile || user) {
        // Priority 1: From raw profile (most reliable - contains full Casdoor data)
        if (profile) {
          const profileData = profile as any;
          if (
            profileData.isAdmin === true ||
            (Array.isArray(profileData.roles) &&
              profileData.roles.some((r: any) => r.name === 'admin'))
          ) {
            isAdmin = true;
            //console.log('[JWT Callback] isAdmin from profile:', isAdmin);
          }
        }

        // Priority 2: From user object (processed by profile callback)
        if (!isAdmin && user && 'isAdmin' in user) {
          isAdmin = user.isAdmin as boolean;
          //console.log('[JWT Callback] isAdmin from user:', isAdmin);
        }
      } else {
        // For SUBSEQUENT requests (only token exists) - preserve existing token value
        isAdmin = token.isAdmin === true;
        //console.log('[JWT Callback] isAdmin from token (subsequent request):', isAdmin);
      }

      console.log('[JWT Callback] Final isAdmin:', isAdmin);
      token.isAdmin = isAdmin;

      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // ref: https://authjs.dev/guides/extending-the-session#with-database
        if (user) {
          session.user.id = user.id;
          // Include isAdmin in session
          if ('isAdmin' in user) {
            session.user.isAdmin = user.isAdmin as boolean;
          }
        } else {
          session.user.id = (token.userId ?? session.user.id) as string;
          // Include isAdmin from JWT token
          if (token.isAdmin !== undefined) {
            session.user.isAdmin = token.isAdmin as boolean;
          }
        }
      }
      return session;
    },
  },
  debug: NEXT_AUTH_DEBUG,
  pages: {
    error: '/next-auth/error',
    signIn: '/next-auth/signin',
  },
  providers: initSSOProviders(),
  secret: NEXT_AUTH_SECRET,
  session: {
    // Force use JWT if server service is disabled
    strategy: NEXT_PUBLIC_ENABLED_SERVER_SERVICE ? NEXT_AUTH_SSO_SESSION_STRATEGY : 'jwt',
  },
  trustHost: process.env?.AUTH_TRUST_HOST ? process.env.AUTH_TRUST_HOST === 'true' : true,
} satisfies NextAuthConfig;
