export async function getUserByClerkId(ctx, id, requireAuth=true) {
  let user;
  if (id) {
    user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", id))
      .unique();
  }
  
  if (requireAuth && !user) {
    throw new Error(`user not found with clerkId ${id}`);
  }

  return user;
}

export async function requireUser(ctx, requireAuth=true) {
  const identity = await ctx.auth.getUserIdentity();
  if (requireAuth && !identity) {
    throw new Error("not authenticated");
  }

  return await getUserByClerkId(ctx, identity?.subject, requireAuth);
}