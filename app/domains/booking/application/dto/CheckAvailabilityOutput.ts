/**
 * Output DTO for availability check.
 */
export interface CheckAvailabilityOutput {
  available: boolean;
  requestedUnits: number;
  availableUnits: number;
  totalUnits: number;
  usedUnits: number;
  conflictingBookings: Array<{
    id: string;
    startDate: string;
    endDate: string;
    units: number;
  }>;
}
