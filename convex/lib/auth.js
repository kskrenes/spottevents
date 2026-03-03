export async function getUserByClerkId(ctx, id, requireAuth=true) {
  let user;
  if (id) {
    user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", id))
      .unique();
  }
  
  if (requireAuth && !user) {
    throw new Error(`User not found with clerkId ${id}`);
  }

  return user;
}

export async function getSessionIdentity(ctx, requireAuth=true) {
  const identity = await ctx.auth.getUserIdentity();

  if (requireAuth && !identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

// Fetches and returns the currently authorized user.
// If requireAuth is true, throws when no session or user is found.
// If requireAuth is false, allowed to return null if no session or user is found.
export async function requireUser(ctx, requireAuth=true) {
  const identity = await getSessionIdentity(ctx, requireAuth);
  return await getUserByClerkId(ctx, identity?.subject, requireAuth);
}