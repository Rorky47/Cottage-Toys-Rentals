-- CreateIndex
CREATE INDEX "bookings_rental_item_id_start_date_idx" ON "bookings"("rental_item_id", "start_date");

-- CreateIndex
CREATE INDEX "bookings_status_order_id_idx" ON "bookings"("status", "order_id");
