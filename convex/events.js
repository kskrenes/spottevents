import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),

    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),

    locationType: v.union(v.literal("physical"), v.literal("online")),
    venue: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),

    capacity: v.number(),
    ticketType: v.union(v.literal("free"), v.literal("paid")),
    ticketPrice: v.optional(v.number()),
    coverImage: v.optional(v.string()),
    themeColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("clerkId"), identity.subject))
      .first();
    
    if (user.plan === "free_user" && user.freeEventsCreated >= 1) {
      throw new Error("Free plan event limit reached");
    }

    try {
      // generate slug from title
      const slug = args.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Add random suffix to ensure uniqueness
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      
      const eventId = await ctx.db.insert("events", {
        title: args.title,
        description: args.description,
        category: args.category,
        tags: args.tags,
        startDate: args.startDate,
        endDate: args.endDate,
        timezone: args.timezone,
        locationType: args.locationType,
        venue: args.venue,
        address: args.address,
        city: args.city,
        state: args.state,
        country: args.country,
        capacity: args.capacity,
        ticketType: args.ticketType,
        ticketPrice: args.ticketPrice,
        coverImage: args.coverImage,
        themeColor: args.themeColor,
        slug: `${slug}-${Date.now()}-${randomSuffix}`,
        organizerId: user._id,
        organizerName: user.name,
        registrationCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (user.plan === "free_user") {
        await ctx.db.patch(user._id, {
          freeEventsCreated: user.freeEventsCreated + 1,
        });
      };

      return eventId;
    } catch(error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }
});

export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    return event;
  }
});

export const getMyEvents = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("clerkId"), identity.subject))
      .first();
    if (!user) return null;

    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .order("desc")
      .collect();

    return events;
  }
})

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("clerkId"), identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.organizerId !== user._id) {
      throw new Error("You are not authorized to delete this event");
    }

    // delete all registrations for the event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }

    // delete the event
    await ctx.db.delete(args.eventId);

    // only decrement free events if user does not have Pro
    if (user.plan === "free_user" && user.freeEventsCreated > 0) {
      await ctx.db.patch(user._id, {
        freeEventsCreated: user.freeEventsCreated - 1,
      });
    }

    return { success: true };
  }
});