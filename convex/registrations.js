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
      // fetch current user and throw if not found
      const user = await requireUser(ctx);

      // fetch event by id and throw if not found
      const event = await ctx.db.get(args.eventId);
      if (!event) {
        throw new Error("event not found");
      }

      // check if user is already registered
      const existingRegistration = await ctx.db
        .query("registrations")
        .withIndex("by_event_user", (q) => 
          q.eq("eventId", args.eventId).eq("userId", user._id)
        )
        .unique();

      // throw if user already has an active registration
      if (existingRegistration && existingRegistration.status === "confirmed") {
        throw new Error("already registered");
      }

      // throw if event is full
      if (event.registrationCount >= event.capacity) {
        throw new Error("event registration capacity reached");
      }

      // if registration exists and wasn't active, reactivate it by updating the status
      // also update attendee name and email in case they've changed
      if (existingRegistration) {
        registrationId = existingRegistration._id;
        await ctx.db.patch(registrationId, {
          status: "confirmed",
          attendeeName: args.attendeeName,
          attendeeEmail: args.attendeeEmail,
        });
      } else {
        // create registration 
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
    // fetch current user and throw if not found
    const user = await requireUser(ctx);

    // fetch the user's registration for given event id
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    // return the registration if found, or null if none found
    return registration;
  }
});

export const getMyRegistrations = query({
  handler: async (ctx) => {
    // fetch current user and throw if not found
    const user = await requireUser(ctx);

    // get all registrations belonging to the user
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect(); // TODO: consider using pagination to manage growing history

    // map each registration to its event and create a list of objects
    // where each object contains one registration and its associated event
    const registrationsWithEvents = await Promise.all(
      registrations.map(async (reg) => {
        const event = await ctx.db.get(reg.eventId);
        return { ...reg, event };
      })
    );
    
    // filter out any deleted/null events and return the list
    return registrationsWithEvents.filter((reg) => reg.event !== null);
  }
});

export const cancelRegistration = mutation({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args) => {
    try {
      // fetch current user and throw if not found
      const user = await requireUser(ctx);

      // fetch registration by id and throw if not found
      const registration = await ctx.db.get(args.registrationId);
      if (!registration) {
        throw new Error("registration not found");
      }

      // throw if mismatched user ids
      if (registration.userId !== user._id) {
        throw new Error("unauthorized user");
      }

      // fetch associated event and throw if not found
      const event = await ctx.db.get(registration.eventId);
      if (!event) {
        throw new Error("event not found");
      }

      // avoid double-decrement and just return if already cancelled
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