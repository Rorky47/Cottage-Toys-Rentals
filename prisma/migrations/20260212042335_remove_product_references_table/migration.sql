/*
  Warnings:

  - You are about to drop the `product_references` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "shop_settings" ADD COLUMN     "privacy_accepted_version" TEXT;

-- DropTable
DROP TABLE "product_references";
