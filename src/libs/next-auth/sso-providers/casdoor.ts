import { OIDCConfig, OIDCUserConfig } from '@auth/core/providers';

import { CommonProviderConfig } from './sso.config';

interface CasdoorProfile extends Record<string, any> {
  avatar: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  id: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  lastName: string;
  name: string;
  owner: string;
  permanentAvatar: string;
  role?: string;
  roles?: string[];
}

function LobeCasdoorProvider(config: OIDCUserConfig<CasdoorProfile>): OIDCConfig<CasdoorProfile> {
  return {
    ...CommonProviderConfig,
    ...config,
    id: 'casdoor',
    name: 'Casdoor',
    profile(profile) {
      // Debug: Log full profile to see what Casdoor returns
      console.log('=== [Casdoor Profile] ===');
      console.log('Available fields:', Object.keys(profile));
      console.log('roles:', profile.roles);
      console.log('role:', profile.role);
      console.log('isAdmin:', profile.isAdmin);
      console.log('is_admin:', profile.is_admin);
      console.log('========================');

      // Check if user has admin role
      const hasAdminRole =
        profile.isAdmin === true ||
        profile.is_admin === true ||
        (Array.isArray(profile.roles) && profile.roles.includes('admin')) ||
        profile.role === 'admin';

      console.log('[Casdoor] Computed isAdmin:', hasAdminRole);

      return {
        email: profile.email,
        emailVerified: profile.emailVerified ? new Date() : null,
        id: profile.id,
        image: profile.avatar,
        isAdmin: hasAdminRole,
        name: profile.displayName ?? profile.firstName ?? profile.lastName,
        providerAccountId: profile.id,
      };
    },
    type: 'oidc',
  };
}

const provider = {
  id: 'casdoor',
  provider: LobeCasdoorProvider({
    authorization: {
      params: { scope: 'openid profile email' },
    },
    clientId: process.env.AUTH_CASDOOR_ID,
    clientSecret: process.env.AUTH_CASDOOR_SECRET,
    issuer: process.env.AUTH_CASDOOR_ISSUER,
  }),
};

export default provider;
