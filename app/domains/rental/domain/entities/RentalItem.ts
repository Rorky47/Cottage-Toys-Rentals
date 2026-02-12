import { Entity, Result, Money } from "~/shared/kernel";

export enum PricingAlgorithm {
  FLAT = "FLAT",
  TIERED = "TIERED",
}

export interface RateTier {
  minDays: number;
  pricePerDay: Money;
}

interface RentalItemProps {
  shop: string;
  shopifyProductId: string;
  name: string | null;
  imageUrl: string | null;
  currencyCode: string;
  basePricePerDay: Money;
  pricingAlgorithm: PricingAlgorithm;
  quantity: number;
  rateTiers: RateTier[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RentalItem entity represents a product configured for rental.
 * Contains pricing configuration and available quantity.
 */
export class RentalItem extends Entity {
  private constructor(
    id: string,
    private props: RentalItemProps
  ) {
    super(id);
  }

  static create(data: {
    id?: string;
    shop: string;
    shopifyProductId: string;
    name: string | null;
    imageUrl: string | null;
    currencyCode: string;
    basePricePerDay: Money;
    pricingAlgorithm: PricingAlgorithm;
    quantity: number;
    rateTiers?: Array<{ minDays: number; pricePerDayCents: number }>;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<RentalItem> {
    const basePriceResult = data.basePricePerDay;
    if (basePriceResult.cents < 0) {
      return Result.fail("Base price cannot be negative");
    }

    if (data.quantity < 0) {
      return Result.fail("Quantity cannot be negative");
    }

    const rateTiers: RateTier[] = [];
    if (data.rateTiers) {
      for (const tier of data.rateTiers) {
        const priceResult = Money.fromCents(tier.pricePerDayCents, data.currencyCode);
        if (priceResult.isFailure) {
          return Result.fail(`Invalid rate tier price: ${priceResult.error}`);
        }
        rateTiers.push({
          minDays: tier.minDays,
          pricePerDay: priceResult.value,
        });
      }
      // Sort by minDays ascending
      rateTiers.sort((a, b) => a.minDays - b.minDays);
    }

    const rentalItem = new RentalItem(data.id || crypto.randomUUID(), {
      shop: data.shop,
      shopifyProductId: data.shopifyProductId,
      name: data.name,
      imageUrl: data.imageUrl,
      currencyCode: data.currencyCode,
      basePricePerDay: basePriceResult,
      pricingAlgorithm: data.pricingAlgorithm,
      quantity: data.quantity,
      rateTiers,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    });

    return Result.ok(rentalItem);
  }

  /**
   * Update metadata fields (name, image, currency) from Shopify.
   * Used when syncing product info.
   */
  updateMetadata(name: string, imageUrl: string | null, currencyCode: string): void {
    this.props.name = name;
    this.props.imageUrl = imageUrl;
    this.props.currencyCode = currencyCode;
    this.props.updatedAt = new Date();
  }

  /**
   * Update basic fields (used by upsert in webhooks).
   */
  updateBasics(data: {
    name?: string;
    imageUrl?: string | null;
    currencyCode?: string;
    basePricePerDayCents?: number;
  }): Result<void> {
    if (data.name !== undefined) {
      this.props.name = data.name;
    }
    if (data.imageUrl !== undefined) {
      this.props.imageUrl = data.imageUrl;
    }
    if (data.currencyCode !== undefined) {
      this.props.currencyCode = data.currencyCode;
    }
    if (data.basePricePerDayCents !== undefined) {
      const priceResult = Money.fromCents(data.basePricePerDayCents, this.props.currencyCode);
      if (priceResult.isFailure) {
        return Result.fail(priceResult.error);
      }
      this.props.basePricePerDay = priceResult.value;
    }
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  updatePricing(
    basePricePerDay: Money,
    algorithm: PricingAlgorithm,
    rateTiers: Array<{ minDays: number; pricePerDayCents: number }>,
    quantity: number
  ): Result<void> {
    if (basePricePerDay.cents < 0) {
      return Result.fail("Base price cannot be negative");
    }

    if (quantity < 0) {
      return Result.fail("Quantity cannot be negative");
    }

    this.props.basePricePerDay = basePricePerDay;
    this.props.pricingAlgorithm = algorithm;
    this.props.quantity = quantity;

    if (rateTiers) {
      const newTiers: RateTier[] = [];
      for (const tier of rateTiers) {
        const priceResult = Money.fromCents(tier.pricePerDayCents, this.props.currencyCode);
        if (priceResult.isFailure) {
          return Result.fail(`Invalid rate tier price: ${priceResult.error}`);
        }
        newTiers.push({
          minDays: tier.minDays,
          pricePerDay: priceResult.value,
        });
      }
      newTiers.sort((a, b) => a.minDays - b.minDays);
      this.props.rateTiers = newTiers;
    } else {
      this.props.rateTiers = [];
    }

    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  updateQuantity(quantity: number): Result<void> {
    if (quantity < 0) {
      return Result.fail("Quantity cannot be negative");
    }
    this.props.quantity = quantity;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  get shop(): string {
    return this.props.shop;
  }

  get shopifyProductId(): string {
    return this.props.shopifyProductId;
  }

  get name(): string | null {
    return this.props.name;
  }

  get imageUrl(): string | null {
    return this.props.imageUrl;
  }

  get currencyCode(): string {
    return this.props.currencyCode;
  }

  get basePricePerDay(): Money {
    return this.props.basePricePerDay;
  }

  get pricingAlgorithm(): PricingAlgorithm {
    return this.props.pricingAlgorithm;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get rateTiers(): ReadonlyArray<RateTier> {
    return this.props.rateTiers;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
