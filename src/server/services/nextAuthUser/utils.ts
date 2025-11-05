import { AdapterAuthenticator, AdapterUser } from 'next-auth/adapters';

import { NewUser } from '@/database/schemas';

export const mapAdapterUserToLobeUser = (adapterUser: AdapterUser): NewUser => {
  const { id, email, name, image, emailVerified } = adapterUser;
  return {
    avatar: image,
    email,
    emailVerifiedAt: emailVerified ? new Date(emailVerified) : undefined,
    fullName: name,
    id,
    isAdmin: 'isAdmin' in adapterUser ? (adapterUser.isAdmin as boolean) : false,
  };
};

export const partialMapAdapterUserToLobeUser = (user: Partial<AdapterUser>): Partial<NewUser> => {
  const { id, name, email, image, emailVerified } = user;
  return {
    avatar: image,
    email,
    emailVerifiedAt: emailVerified ? new Date(emailVerified) : undefined,
    fullName: name,
    id,
    isAdmin: 'isAdmin' in user ? (user.isAdmin as boolean) : undefined,
  };
};

export const mapLobeUserToAdapterUser = (lobeUser: NewUser): AdapterUser => {
  const { id, fullName, email, avatar, emailVerifiedAt, isAdmin } = lobeUser;
  return {
    // In LobeUser, email is nullable
    email: email ?? '',
    emailVerified: emailVerifiedAt ? new Date(emailVerifiedAt) : null,
    id,
    image: avatar,
    isAdmin: isAdmin ?? undefined,
    name: fullName,
  };
};

type AuthenticatorQueryResult = {
  counter: number;
  credentialBackedUp: boolean;
  credentialDeviceType: string;
  credentialID: string;
  credentialPublicKey: string;
  providerAccountId: string;
  transports: string | null;
  userId: string;
};

export const mapAuthenticatorQueryResutlToAdapterAuthenticator = (
  authenticator: AuthenticatorQueryResult,
): AdapterAuthenticator => {
  return {
    ...authenticator,
    transports: authenticator?.transports ?? undefined,
  };
};
