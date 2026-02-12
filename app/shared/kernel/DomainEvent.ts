/**
 * Base interface for domain events.
 * Domain events represent something that happened in the domain.
 */
export interface DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly eventName: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly eventName: string;

  constructor(aggregateId: string, eventName: string) {
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
    this.eventName = eventName;
  }
}
