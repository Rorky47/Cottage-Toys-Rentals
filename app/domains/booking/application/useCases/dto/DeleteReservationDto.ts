/**
 * DTO for DeleteReservationUseCase
 */

export interface DeleteReservationInput {
  bookingRef: string;
}

export interface DeleteReservationOutput {
  deleted: boolean;
}
