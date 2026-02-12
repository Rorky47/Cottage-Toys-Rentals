import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify";
import db from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`[appUninstalled] Received ${topic} webhook for ${shop}`);

  // 1. Delete webhook subscriptions from Shopify (App Store requirement)
  if (admin) {
    try {
      const response = await admin.graphql(`
        query {
          webhookSubscriptions(first: 100) {
            edges {
              node {
                id
              }
            }
          }
        }
      `);
      const data = await response.json();
      const webhooks = data.data?.webhookSubscriptions?.edges || [];
      
      for (const webhook of webhooks) {
        await admin.graphql(`
          mutation {
            webhookSubscriptionDelete(id: "${webhook.node.id}") {
              deletedWebhookSubscriptionId
            }
          }
        `);
      }
      console.log(`[appUninstalled] Deleted ${webhooks.length} webhook subscriptions`);
    } catch (error) {
      console.error(`[appUninstalled] Failed to delete webhooks:`, error);
    }

    // 2. Delete metafields from products (App Store requirement)
    try {
      // Get all rental items to find products with metafields
      const rentalItems = await db.rentalItem.findMany({
        where: { shop },
        select: { shopifyProductId: true },
      });

      console.log(`[appUninstalled] Found ${rentalItems.length} products with rental metafields`);

      // Delete rental pricing metafield from each product
      for (const item of rentalItems) {
        const productGid = `gid://shopify/Product/${item.shopifyProductId}`;
        try {
          await admin.graphql(`
            mutation {
              metafieldsDelete(metafields: [{
                ownerId: "${productGid}",
                namespace: "rental",
                key: "pricing"
              }]) {
                deletedMetafields {
                  ownerId
                  namespace
                  key
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `);
        } catch (metafieldError) {
          console.error(`[appUninstalled] Failed to delete metafield for product ${item.shopifyProductId}:`, metafieldError);
        }
      }
      console.log(`[appUninstalled] Deleted metafields from ${rentalItems.length} products`);
    } catch (error) {
      console.error(`[appUninstalled] Failed to clean up metafields:`, error);
    }
  }

  // 3. Delete all app data from database
  // Note: Session might already be invalidated, but we can still clean up by shop domain
  try {
    // Get all rental item IDs for this shop first (needed to delete bookings)
    const rentalItems = await db.rentalItem.findMany({
      where: { shop },
      select: { id: true },
    });
    const rentalItemIds = rentalItems.map(item => item.id);
    
    // Delete bookings (via rental item IDs, since Booking has no shop field)
    if (rentalItemIds.length > 0) {
      await db.booking.deleteMany({
        where: { rentalItemId: { in: rentalItemIds } },
      });
    }
    
    // Delete rental items (cascades to rate tiers via Prisma schema)
    await db.rentalItem.deleteMany({ where: { shop } });
    
    // Delete shop settings
    await db.shopSettings.deleteMany({ where: { shop } });
    
    // Delete sessions
    await db.session.deleteMany({ where: { shop } });
    
    console.log(`[appUninstalled] Cleaned up all app data for ${shop}`);
  } catch (error) {
    console.error(`[appUninstalled] Failed to clean up app data:`, error);
  }

  console.log(`[appUninstalled] Uninstall cleanup complete for ${shop}`);
  return new Response();
};

