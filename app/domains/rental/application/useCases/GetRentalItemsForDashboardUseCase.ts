import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import { Result } from "~/shared/kernel/Result";
import type {
  GetRentalItemsForDashboardInput,
  GetRentalItemsForDashboardOutput,
  DashboardRentalItemDto,
} from "./dto/GetRentalItemsForDashboardDto";

/**
 * GetRentalItemsForDashboardUseCase
 * 
 * Fetches all rental items for a shop to display in the admin dashboard.
 * 
 * **Note**: This use case fetches rental items with their rate tier IDs for display.
 * It's a read-only operation. The calling code (home.server.ts) enriches the data 
 * with Shopify product info.
 * 
 * @example
 * ```typescript
 * const useCase = new GetRentalItemsForDashboardUseCase(rentalItemRepo);
 * const result = await useCase.execute({ shop: "myshop.myshopify.com" });
 * ```
 */
export class GetRentalItemsForDashboardUseCase {
  constructor(private rentalItemRepository: IRentalItemRepository) {}

  async execute(input: GetRentalItemsForDashboardInput): Promise<Result<GetRentalItemsForDashboardOutput>> {
    const { shop } = input;

    if (!shop || typeof shop !== "string") {
      return Result.fail("Shop is required");
    }

    try {
      // Fetch rental items with rate tier IDs (for dashboard display)
      const items = await this.rentalItemRepository.findByShopWithTierIds(shop);

      // Map to DTOs (already in the right format from repository)
      const rentalItems: DashboardRentalItemDto[] = items.map((item) => ({
        id: item.id,
        shopifyProductId: item.shopifyProductId,
        name: item.name,
        imageUrl: item.imageUrl,
        currencyCode: item.currencyCode,
        basePricePerDayCents: item.basePricePerDayCents,
        pricingAlgorithm: item.pricingAlgorithm,
        quantity: item.quantity,
        rateTiers: item.rateTiers,
      }));

      return Result.ok({ rentalItems });
    } catch (error: any) {
      return Result.fail(`Failed to fetch rental items: ${error.message}`);
    }
  }
}
