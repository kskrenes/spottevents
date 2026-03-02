import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

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
    let registrationId;
    try {
      const user = await requireUser(ctx);

      const event = await ctx.db.get(args.eventId);
      if (!event) {
        throw new Error("event not found");
      }

      // check if event is full
      if (event.registrationCount >= event.capacity) {
        throw new Error("event registration capacity reached");
      }

      // check if user is already registered
      const existingRegistration = await ctx.db
        .query("registrations")
        .withIndex("by_event_user", (q) => 
          q.eq("eventId", args.eventId).eq("userId", user._id)
        )
        .unique();

      if (existingRegistration) {
        if (existingRegistration.status === "confirmed") {
          throw new Error("already registered");
        }

        // existing registration was cancelled, so update the status
        // as well as attendee name and email in case they've changed
        registrationId = existingRegistration._id;
        await ctx.db.patch(registrationId, {
          status: "confirmed",
          attendeeName: args.attendeeName,
          attendeeEmail: args.attendeeEmail,
        });
      } else {
        // add registration 
        const qrCode = generateQRCode();
        registrationId = await ctx.db.insert("registrations", {
          eventId: args.eventId,
          userId: user._id,
          attendeeName: args.attendeeName, 
          attendeeEmail: args.attendeeEmail,
          qrCode: qrCode,
          checkedIn: false,
          status: "confirmed",
          registeredAt: Date.now(),
        });
      }

      // update event registration count
      await ctx.db.patch(args.eventId, {
        registrationCount: event.registrationCount + 1,
      });
    } catch (error) {
      throw new Error(`Failed to register for event: ${error.message}`);
    }

    return registrationId;
  }
});

export const checkRegistration = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

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
    const user = await requireUser(ctx);

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect(); // TODO: consider using pagination to manage growing history

    const registrationsWithEvents = await Promise.all(
      registrations.map(async (reg) => {
        const event = await ctx.db.get(reg.eventId);
        return { ...reg, event };
      })
    );
    
    // filter out any deleted/null events and return
    return registrationsWithEvents.filter((reg) => reg.event !== null);
  }
});

export const cancelRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx);
      const registration = await ctx.db.get(args.registrationId);

      if (!registration) {
        throw new Error("registration not found");
      }

      if (registration.userId !== user._id) {
        throw new Error("unauthorized user");
      }

      const event = await ctx.db.get(registration.eventId);

      if (!event) {
        throw new Error("event not found");
      }

      // avoid double-decrement on repeated cancels
      if (registration.status === "cancelled") {
        return { success: true };
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
    } catch (error) {
      throw new Error(`Failed to cancel registration: ${error.message}`);
    }
    
    return {success: true};
  }
});