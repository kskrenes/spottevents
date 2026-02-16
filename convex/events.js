import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

    // TODO: check for subscription plan on backend
    hasPro: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    console.log("createEvent.user: ", user);
    
    if (!args.hasPro && user.freeEventsCreated > 0) {
      throw new Error("You cannot create more than one free event");
    }

    try {
      // generate slug from title
      const slug = args.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
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
        slug: `${slug}-${Date.now()}`,
        organizerId: user._id,
        organizerName: user.name,
        registrationCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (!args.hasPro) {
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
    const user = await ctx.runQuery(internal.users.getCurrentUser);

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
    hasPro: v.boolean()
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
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
      await ctx.db.delete("registrations", registration._id);
    }

    // delete the event
    await ctx.db.delete(args.eventId);

    // only decrement free events if user does not have Pro
    if (!args.hasPro && user.freeEventsCreated > 0) {
      await ctx.db.patch(user._id, {
        freeEventsCreated: user.freeEventsCreated - 1,
      });
    }

    return { success: true };
  }
});