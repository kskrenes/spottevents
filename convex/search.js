import { v } from "convex/values";
import { query } from "./_generated/server";
import { NUM_SEARCH_RESULTS } from "../lib/layout-utils";

export const searchEvents = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // only search if query is 2 or more non-whitespace characters
    if (!args.query || args.query.trim().length < 2) return [];

    // search all events that haven't started yet
    // limit results to supplied limit or default value
    const searchResults = await ctx.db
      .query("events")
      .withSearchIndex("search_title", (q) => q.search("title", args.query))
      .filter((q) => q.gte(q.field("startDate"), Date.now()))
      .take(args.limit ?? NUM_SEARCH_RESULTS);

    return searchResults;
  }
})