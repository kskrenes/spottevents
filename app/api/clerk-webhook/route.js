import { Webhook } from "svix";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(req) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  const evt = webhook.verify(payload, headers);

  if (evt.type === "subscription.updated") {
    const userId = evt.data.payer.user_id;
    const currentSub = evt.data.items.pop();
    const plan = currentSub.plan.slug;

    await convex.mutation(api.users.updatePlan, {
      clerkId: userId,
      plan,
    });
  }

  return new Response("ok", { status: 200 });
}