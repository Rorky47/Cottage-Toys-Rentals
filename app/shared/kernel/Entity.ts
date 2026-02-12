import type { DomainEvent } from "./DomainEvent";

/**
 * Base class for domain entities.
 * Entities have identity and can emit domain events.
 */
export abstract class Entity {
  private _domainEvents: DomainEvent[] = [];

  constructor(protected readonly _id: string) {}

  get id(): string {
    return this._id;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public getDomainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  equals(other: Entity): boolean {
    if (!other || !(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }
}
