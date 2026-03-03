import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getSessionIdentity, getUserByClerkId, requireUser } from "./lib/auth";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // getSessionIdentity will throw if no auth is found
      const identity = getSessionIdentity(ctx);

      // set requireAuth to false to allow null if no user is found
      const user = getUserByClerkId(ctx, identity.subject, false);

      // update name if user exists
      if (user !== null) {
        if (user.name !== identity.name) {
          await ctx.db.patch(user._id, { name: identity.name });
        }
        return user._id;
      }

      // if user does not exist, create it from the auth identity
      return await ctx.db.insert("users", {
        name: identity.name ?? "Anonymous",
        tokenIdentifier: identity.tokenIdentifier,
        clerkId: identity.subject,
        plan: "free_user",
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl,
        hasCompletedOnboarding: false,
        freeEventsCreated: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    // auth not required, just return null if no user is logged in
    const user = await requireUser(ctx, false);
    if (!user) return null;

    return user;
  }
});

export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // auth not required, just return null if no user is logged in
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // limit return object to public profile (eliminate unnecessary and potentially sensitive fields)
    return {
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl ?? null,
    };
  }
});

export const completeOnboarding = mutation({
  args: {
    location: v.object({
      city: v.string(),
      state: v.optional(v.string()),
      country: v.string(),
    }),
    interests: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // fetch current user and throw if not found
      const user = await requireUser(ctx);

      // update onboarding values in user table
      await ctx.db.patch(user._id, {
        hasCompletedOnboarding: true,
        location: args.location,
        interests: args.interests,
        updatedAt: Date.now(),
      });

      // return the user id
      return user._id;
    } catch (error) {
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }
  }
});

export const updatePlan = internalMutation({
  args: { 
    clerkId: v.string(), 
    plan: v.union(v.literal("free_user"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    // fetch user matching the clerkId, and fail silently if no match found
    const user = await getUserByClerkId(ctx, args.clerkId, false);
    if (!user) return;

    // update the user's subscription plan in users table
    await ctx.db.patch(user._id, { 
      plan: args.plan,
      updatedAt: Date.now() 
    });
  },
});