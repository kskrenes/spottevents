import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const headers = Object.fromEntries(request.headers);

    // verify this is a valid webhook from clerk
    let evt;
    try {
      const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
      evt = webhook.verify(payload, headers);
    } catch {
      console.error("Webhook received with invalid signature");
      return new Response("Invalid signature", { status: 400 });
    }

    try {
      if (evt.type === "subscription.updated") {
        const items = Array.isArray(evt.data?.items) ? evt.data.items : [];
        const currentSub = items.find(item => item.status === "active");
  
        if (!currentSub?.plan?.slug || !evt.data?.payer?.user_id) {
          console.error("Webhook received with invalid payload");
          return new Response("Invalid payload", { status: 400 });
        }

        const userId = evt.data.payer.user_id;
        const planSlug = currentSub.plan.slug;

        // normalize plan slug in case of unexpected values
        const plan =
          planSlug === "pro" ? "pro" :
          planSlug === "free_user" ? "free_user" :
          null;

        if (!plan) {
          console.error("Webhook received with unsupported plan: ", planSlug);
          return new Response("Unsupported plan", { status: 400 });
        }
  
        // update the user's plan in users table
        await ctx.runMutation(internal.users.updatePlan, {
          clerkId: userId,
          plan,
        });
      }
    } catch {
      console.error("Webhook processing failed: ", error);
      return new Response("Webhook processing failed", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  })
});

export default http;