import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const getEventDashboard = query({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    // fetch current user and throw if not found
    const user = await requireUser(ctx);

    // fetch event by id and throw if not found
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // throw if user is not the creator of the event
    if (event.organizerId !== user._id) {
      throw new Error("You are not authorized to view this dashboard");
    }

    // fetch all registrations associated with the event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // calculate number of active registrations
    const totalRegistrations = registrations.filter(
      (r) => r.status === "confirmed"
    ).length;

    // calculate number of registrants checked in
    const checkedInCount = registrations.filter(
      (r) => r.checkedIn && r.status === "confirmed"
    ).length;

    // calculate number of registrants remaining to check in
    const pendingCount = totalRegistrations - checkedInCount;

    // calculate revenue for paid events
    let totalRevenue = 0;
    if (event.ticketType === "paid" && event.ticketPrice) {
      totalRevenue = checkedInCount * event.ticketPrice;
    }

    // calculate check-in rate
    const checkInRate = 
      totalRegistrations > 0
        ? Math.round((checkedInCount / totalRegistrations) * 100)
        : 0;

    // return dashboard object
    return {
      event,
      stats: {
        totalRegistrations,
        checkedInCount,
        pendingCount,
        capacity: event.capacity,
        checkInRate,
        totalRevenue,
      }
    };
  }
});