import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getUserByClerkId, requireUser } from "./lib/auth";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("not authenticated");
      }

      // Check if we've already stored this identity before.
      // Note: If you don't want to define an index right away, you can use
      // ctx.db.query("users")
      //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      //  .unique();
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();
      if (user !== null) {
        // If we've seen this identity before but the name has changed, patch the value.
        if (user.name !== identity.name) {
          await ctx.db.patch(user._id, { name: identity.name });
        }
        return user._id;
      }
      // If it's a new identity, create a new `User`.
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
      const user = await requireUser(ctx);

      await ctx.db.patch(user._id, {
        hasCompletedOnboarding: true,
        location: args.location,
        interests: args.interests,
        updatedAt: Date.now(),
      });

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
    const user = await getUserByClerkId(ctx, clerkId, false);

    if (user) {
      await ctx.db.patch(user._id, { 
        plan: args.plan,
        updatedAt: Date.now() 
      });
    }
  },
});