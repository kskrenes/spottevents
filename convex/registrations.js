import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

const generateQRCode = () => {
  return `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

export const registerForEvent = mutation({
  args: {
    eventId: v.id("events"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    // check if user is authenticated
    if (!user) {
      throw new Error("Authentication required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // check if event is full
    if (event.registrationCount >= event.capacity) {
      throw new Error("Event is full");
    }

    // check if user is already registered
    const existingRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) => 
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (existingRegistration) {
      throw new Error("You are already registered for this event");
    }

    // add registration 
    const qrCode = generateQRCode();
    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      userId: user._id,
      attendeeName: args.attendeeName, 
      attendeeEmail: args.attendeeEmail,
      qrCode: qrCode,
      checkedIn: false,
      status: "confirmed",
      registeredAt: Date.now(),
    });

    // update event registration count
    await ctx.db.patch(args.eventId, {
      registrationCount: event.registrationCount + 1,
    });

    return registrationId;
  }
});

export const checkRegistration = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    // nothing to return if user is not authenticated
    if (!user) {
      return null;
    }

    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    return registration;
  }
});

export const getMyRegistrations = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    // nothing to return if user is not authenticated
    if (!user) {
      return null;
    }

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const registrationsWithEvents = await Promise.all(
      registrations.map(async (reg) => {
        const event = await ctx.db.get(reg.eventId);
        return { ...reg, event };
      })
    );

    return registrationsWithEvents;
  }
});

export const cancelRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user) {
      throw new Error("You must be logged in to cancel a registration");
    }

    const registration = await ctx.db.get(args.registrationId);

    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.userId !== user._id) {
      throw new Error("You can only cancel your own registrations");
    }

    const event = await ctx.db.get(registration.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // update registration status
    await ctx.db.patch(args.registrationId, {
      status: "cancelled",
    });

    // decrement event registration count
    if (event.registrationCount > 0) {
      await ctx.db.patch(registration.eventId, {
        registrationCount: event.registrationCount - 1,
      });
    }
    
    return {success: true};
  }
});