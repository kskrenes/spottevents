import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { NUM_FEATURED_EVENTS, NUM_LOCAL_EVENTS, NUM_POPULAR_EVENTS } from "@/lib/layout-utils";

const EVENT_REDUCTION_ARRAY = [[],[],[],[]];

const getReducedEvents = (events, city, state, categories) => {
  // reduce events into array (acc) of 4 arrays, in order of display priority: 
  // [0]: event matches both location and interests of user
  // [1]: event matches location of user but not interests
  // [2]: event matches interests of user but not location
  // [3]: event does not match user's location or interests
  return events.reduce((acc, currentElement) => {
    if (currentElement.city?.toLowerCase() === city?.toLowerCase() && 
        currentElement.state?.toLowerCase() === state?.toLowerCase()) 
    {
      acc[1].push(currentElement);
      if (categories && categories.includes(currentElement.category)) {
        acc[0].push(acc[1].pop());
      }
    } else if (categories && categories.includes(currentElement.category)) {
      acc[2].push(currentElement);
    } else {
      acc[3].push(currentElement);
    }
    return acc;
  }, EVENT_REDUCTION_ARRAY.slice());
}

const getEventsToSort = (reduced, min, toSort=[], idx=0) => {
  // add items to the resulting array in order of display priority until 
  // the min number of items is met or all items are added
  const result = toSort.concat(reduced[idx]);
  if (result.length < min && idx < EVENT_REDUCTION_ARRAY.length - 1) {
    return getEventsToSort(reduced, min, result, ++idx)
  }
  return result;
}

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
  
    const eventsToSort = 
      getEventsToSort(
        getReducedEvents(events, args.city, args.state, args.categories), 
        args.limit ?? NUM_FEATURED_EVENTS
      )

    // sort by registration count for featured events
    const featured = eventsToSort
    .sort((a, b) => b.registrationCount - a.registrationCount)
    .slice(0, args.limit ?? NUM_FEATURED_EVENTS);

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

    return events.slice(0, args.limit ?? NUM_LOCAL_EVENTS);
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

    // const eventsToSort = 
    //   getEventsToSort(
    //     getReducedEvents(events, args.city, args.state, args.categories), 
    //     args.limit ?? NUM_POPULAR_EVENTS
    //   )
    
    // sort by registration count for popular events
    // const popular = eventsToSort
    const popular = events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? NUM_POPULAR_EVENTS);

    return popular;
  }
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    //
  }
});