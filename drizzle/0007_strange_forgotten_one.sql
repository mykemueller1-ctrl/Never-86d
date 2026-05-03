CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`posItemName` varchar(255) NOT NULL,
	`recipeId` int,
	`menuPrice` decimal(10,2) NOT NULL,
	`category` varchar(50) NOT NULL,
	`subcategory` varchar(50),
	`theoreticalCost` decimal(10,4),
	`actualCost` decimal(10,4),
	`marginPercent` decimal(5,2),
	`avgDailySales` decimal(10,2),
	`avgDailyQuantity` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastAnalyzedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipeId` int NOT NULL,
	`skuId` int,
	`ingredientName` varchar(255) NOT NULL,
	`quantity` decimal(10,4) NOT NULL,
	`unitOfMeasure` varchar(30) NOT NULL,
	`costPerUnit` decimal(10,4),
	`totalCost` decimal(10,4),
	`yieldPercent` decimal(5,2) DEFAULT '100.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recipe_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL,
	`subcategory` varchar(50),
	`servingSize` varchar(100),
	`prepTimeMinutes` int,
	`prepInstructions` text,
	`theoreticalCost` decimal(10,4),
	`menuPrice` decimal(10,2),
	`foodCostPercent` decimal(5,2),
	`targetFoodCostPercent` decimal(5,2) DEFAULT '30.00',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastCostedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sku_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(50),
	`productName` varchar(255) NOT NULL,
	`vendorName` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL,
	`unitSize` varchar(100),
	`unitOfMeasure` varchar(30),
	`currentPricePerUnit` decimal(10,4),
	`lastOrderPrice` decimal(10,2),
	`lastOrderDate` timestamp,
	`avgPrice30d` decimal(10,4),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sku_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sku_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skuId` int NOT NULL,
	`vendorName` varchar(255) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`pricePerUnit` decimal(10,4),
	`invoiceId` int,
	`invoiceDate` timestamp,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sku_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waste_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int,
	`date` timestamp NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`skuId` int,
	`wasteType` varchar(50) NOT NULL,
	`quantity` decimal(10,4) NOT NULL,
	`unitOfMeasure` varchar(30) NOT NULL,
	`estimatedCost` decimal(10,2),
	`reason` text,
	`preventable` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waste_log_id` PRIMARY KEY(`id`)
);
