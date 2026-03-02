import { TRPCError } from '@trpc/server';

import { enableClerk } from '@/const/auth';
import { DESKTOP_USER_ID } from '@/const/desktop';
import { isDesktop } from '@/const/version';
import { UserModel } from '@/database/models/user';

import { trpc } from '../lambda/init';

/**
 * Admin authentication middleware
 * Ensures the user is authenticated and has admin privileges
 * Must be used after userAuth and serverDatabase middlewares
 */
export const adminAuth = trpc.middleware(async (opts) => {
  const { ctx } = opts;

  // Handle desktop mode
  if (isDesktop) {
    return opts.next({
      ctx: { isAdmin: true, userId: DESKTOP_USER_ID },
    });
  }

  // Check if user is authenticated
  if (!ctx.userId) {
    if (enableClerk) {
      console.info('clerk auth:', ctx.clerkAuth);
    } else {
      console.info('next auth:', ctx.nextAuth);
    }
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
  }

  // Check if database is available (should be provided by serverDatabase middleware)
  if (!('serverDB' in ctx) || !ctx.serverDB) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }

  // Check if user has admin privileges
  // Cast to LobeChatDatabase as the type is not propagated through middleware chain
  const user = await UserModel.findById(ctx.serverDB as any, ctx.userId);

  if (!user || !user.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin privileges required',
    });
  }

  return opts.next({
    ctx: {
      isAdmin: true,
      userId: ctx.userId,
    },
  });
});
