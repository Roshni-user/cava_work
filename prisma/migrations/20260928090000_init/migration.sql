-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "address_kind" AS ENUM ('REGISTERED', 'HEADQUARTERS');

-- CreateEnum
CREATE TYPE "contact_point_kind" AS ENUM ('EMAIL', 'ALTERNATE_EMAIL', 'MOBILE', 'TELEPHONE', 'FAX', 'AREA_CODE_TELEPHONE');

-- CreateTable
CREATE TABLE "catalogue_groups" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogue_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shows" (
    "id" UUID NOT NULL,
    "mmi_show_id" INTEGER NOT NULL,
    "catalogue_group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitors" (
    "id" UUID NOT NULL,
    "mmi_customer_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "show_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "website" TEXT,
    "logo_url" TEXT,
    "company_profile" TEXT,
    "short_company_profile" TEXT,
    "show_catalogue_name" TEXT,
    "type_of_exhibitor" TEXT,
    "participated_by" TEXT,
    "participated_country" TEXT,
    "associations" TEXT,
    "gst_number" TEXT,
    "tan_number" TEXT,
    "pan_number" TEXT,
    "gst_status" TEXT,
    "exhibitor_type" TEXT,
    "sponsorship" TEXT,
    "booth_number" TEXT,
    "hall_number" TEXT,
    "booth_type" TEXT,
    "square_metres" DECIMAL(10,2),
    "interested_square_metres" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "exhibitor_id" UUID NOT NULL,
    "kind" "address_kind" NOT NULL,
    "line1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "exhibitor_id" UUID NOT NULL,
    "title" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "designation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_points" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "kind" "contact_point_kind" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "mmi_category_id" INTEGER NOT NULL,
    "main_category" TEXT NOT NULL,
    "sub_category" TEXT,
    "category_name" TEXT,
    "category_type" TEXT NOT NULL,
    "product_category_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitor_categories" (
    "id" UUID NOT NULL,
    "mmi_customer_category_id" INTEGER NOT NULL,
    "exhibitor_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitor_products" (
    "id" UUID NOT NULL,
    "exhibitor_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitor_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_features" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "message" TEXT NOT NULL,
    "product_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_groups_code_key" ON "catalogue_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shows_mmi_show_id_key" ON "shows"("mmi_show_id");

-- CreateIndex
CREATE INDEX "shows_catalogue_group_id_idx" ON "shows"("catalogue_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitors_mmi_customer_id_key" ON "exhibitors"("mmi_customer_id");

-- CreateIndex
CREATE INDEX "exhibitors_company_name_idx" ON "exhibitors"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitors_show_id_user_id_key" ON "exhibitors"("show_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_exhibitor_id_kind_key" ON "addresses"("exhibitor_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_exhibitor_id_key" ON "contacts"("exhibitor_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_points_contact_id_kind_key" ON "contact_points"("contact_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "categories_mmi_category_id_key" ON "categories"("mmi_category_id");

-- CreateIndex
CREATE INDEX "categories_category_type_product_category_type_idx" ON "categories"("category_type", "product_category_type");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitor_categories_mmi_customer_category_id_key" ON "exhibitor_categories"("mmi_customer_category_id");

-- CreateIndex
CREATE INDEX "exhibitor_categories_category_id_idx" ON "exhibitor_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitor_categories_exhibitor_id_category_id_key" ON "exhibitor_categories"("exhibitor_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitor_products_exhibitor_id_name_key" ON "exhibitor_products"("exhibitor_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_features_product_id_sort_order_key" ON "product_features"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "consultations_email_idx" ON "consultations"("email");

-- CreateIndex
CREATE INDEX "consultations_product_id_idx" ON "consultations"("product_id");

-- CreateIndex
CREATE INDEX "consultations_created_at_idx" ON "consultations"("created_at");

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_catalogue_group_id_fkey" FOREIGN KEY ("catalogue_group_id") REFERENCES "catalogue_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitors" ADD CONSTRAINT "exhibitors_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_exhibitor_id_fkey" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_exhibitor_id_fkey" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_points" ADD CONSTRAINT "contact_points_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitor_categories" ADD CONSTRAINT "exhibitor_categories_exhibitor_id_fkey" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitor_categories" ADD CONSTRAINT "exhibitor_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitor_products" ADD CONSTRAINT "exhibitor_products_exhibitor_id_fkey" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_features" ADD CONSTRAINT "product_features_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
