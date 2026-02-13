import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify";
import db from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`[appUninstalled] Received ${topic} webhook for ${shop}`);

  // Note: Cannot delete metafields here - Shopify revokes token before webhook fires
  
  // Delete all app data from database
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

