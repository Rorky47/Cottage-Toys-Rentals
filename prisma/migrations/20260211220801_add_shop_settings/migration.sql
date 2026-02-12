-- CreateTable
CREATE TABLE "shop_settings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "privacy_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_settings_shop_key" ON "shop_settings"("shop");
