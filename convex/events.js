import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getFeaturedEvents = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .filter((q) => q.gte(q.field("startDate"), now))
      .order("desc")
      .collect();

    // sort by registration count for featured events
    const featured = events
    .sort((a, b) => b.registrationCount - a.registrationCount)
    .slice(0, args.limit ?? 3);

    return featured;
  }
});

export const getEventsByLocation = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let events = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .filter((q) => q.gte(q.field("startDate"), now))
      .collect();

    // filter by city or state
    if (args.city) {
      events = events.filter((event) => event.city?.toLowerCase() === args.city.toLowerCase());
    }
    else if (args.state) {
      events = events.filter((event) => event.state?.toLowerCase() === args.state.toLowerCase());
    }

    return events.slice(0, args.limit ?? 4);
  }
});

export const getEventsByCategory = query({
  args: {
    category: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.gte(q.field("startDate"), now))
      .collect();

    return events.slice(0, args.limit ?? 12);
  }
});

export const getCategoryCounts = query({
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .filter((q) => q.gte(q.field("startDate"), now))
      .collect();

    // count events by category
    const counts = {};
    events.forEach((event) => {
      counts[event.category] = (counts[event.category] || 0) + 1;
    });

    return counts;
  }
});

export const getPopularEvents = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .filter((q) => q.gte(q.field("startDate"), now))
      .collect();

    // sort by registration count for popular events
    const popular = events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? 6);

    return popular;
  }
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    //
  }
});