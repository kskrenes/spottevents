import { Webhook } from "svix";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(req) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let evt;
  try {
    const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    evt = webhook.verify(payload, headers);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  try {
    if (evt.type === "subscription.updated") {
      const items = Array.isArray(evt.data?.items) ? evt.data.items : [];
      const currentSub = items[items.length - 1];

      if (!currentSub?.plan?.slug || !evt.data?.payer?.user_id) {
        return new Response("invalid payload", { status: 400 });
      }

      const userId = evt.data.payer.user_id;
      const plan = currentSub.plan.slug;

      await convex.mutation(api.users.updatePlan, {
        clerkId: userId,
        plan,
      });
    }
  } catch {
    return new Response("webhook processing failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}