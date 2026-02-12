import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import db from "~/db.server";

/**
 * APP_SCOPES_UPDATE webhook
 * 
 * Fired when app scopes are modified in Partner Dashboard.
 * Updates the session with the new scope string.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    console.log(`[appScopesUpdate] Received ${topic} webhook for ${shop}`);

    const current = payload.current as string[];
    
    if (!session) {
      console.log(`[appScopesUpdate] No session found for shop ${shop}, skipping scope update`);
      return new Response("OK", { status: 200 });
    }

    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        scope: current.join(","),
      },
    });

    console.log(`[appScopesUpdate] Updated scopes for ${shop}:`, current.join(","));
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[appScopesUpdate] Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
};

