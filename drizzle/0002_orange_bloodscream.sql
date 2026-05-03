CREATE TABLE `achievement_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`badge` varchar(10) NOT NULL,
	`category` enum('onboarding','reliability','quality','engagement','leadership','longevity') NOT NULL,
	`thresholdType` enum('cumulative','consecutive','window','milestone') NOT NULL,
	`thresholdValue` int NOT NULL,
	`windowDays` int,
	`resetEvent` varchar(100),
	`bonusPoints` int NOT NULL DEFAULT 0,
	`difficulty` enum('easy','medium','hard','legendary') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievement_definitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievement_definitions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `briefing_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`factType` enum('event_pattern','shortage','equipment_issue','staff_pattern','vendor_change','menu_change','seasonal','custom') NOT NULL,
	`fact` text NOT NULL,
	`relevanceScore` int NOT NULL DEFAULT 50,
	`expiresAt` timestamp,
	`sourceType` varchar(50),
	`sourceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefing_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_corrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`correctedByStaffId` int NOT NULL,
	`oldAnswer` text NOT NULL,
	`newAnswer` text NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedByStaffId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_corrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`station` enum('pizza_line','fry_line','bar','waitstaff','bbq_room','store_room','bathroom','dish_pit','general') NOT NULL,
	`category` enum('recipe','location','process','equipment','vendor','allergen','prep','cleaning','safety','menu_info') NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`confidence` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`source` enum('manual','photo_extraction','correction','ai_inferred','imported') NOT NULL DEFAULT 'manual',
	`correctionsCount` int NOT NULL DEFAULT 0,
	`lastCorrectedAt` timestamp,
	`tags` json,
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_guide_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`assignedToStaffId` int,
	`vendorName` varchar(200) NOT NULL,
	`products` json,
	`lastUpdated` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_guide_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photo_missions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` enum('walk_in','station_setup','invoice','equipment','prep','plate','delivery','general') NOT NULL,
	`pointsPerPhoto` int NOT NULL DEFAULT 5,
	`bonusPoints` int NOT NULL DEFAULT 0,
	`targetPhotoCount` int NOT NULL DEFAULT 10,
	`startDate` timestamp,
	`endDate` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photo_missions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photo_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`missionId` int,
	`photoUrl` text NOT NULL,
	`photoType` enum('invoice','shelf','station','equipment','plate','delivery','prep','other') NOT NULL,
	`aiExtraction` json,
	`aiSummary` text,
	`verified` boolean NOT NULL DEFAULT false,
	`verifiedByStaffId` int,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`knowledgeEntryIds` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photo_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`rewardId` int NOT NULL,
	`pointsSpent` int NOT NULL,
	`status` enum('pending','approved','denied','fulfilled') NOT NULL DEFAULT 'pending',
	`approvedByStaffId` int,
	`approvedAt` timestamp,
	`fulfilledAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tier` enum('bronze','silver','gold','platinum','diamond','legend') NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`pointsCost` int NOT NULL,
	`type` enum('meal','merch','schedule','gift_card','time_off','cash') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_achievement_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`achievementId` int NOT NULL,
	`currentValue` int NOT NULL DEFAULT 0,
	`bestValue` int NOT NULL DEFAULT 0,
	`status` enum('in_progress','completed','locked') NOT NULL DEFAULT 'in_progress',
	`streakStartDate` timestamp,
	`lastEventDate` timestamp,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_achievement_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_achievement_unlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`achievementId` int NOT NULL,
	`earnedAt` timestamp NOT NULL,
	`contextSnapshot` json,
	`bonusPointsAwarded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_achievement_unlocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorName` varchar(200) NOT NULL,
	`sku` varchar(50),
	`productName` varchar(300) NOT NULL,
	`category` enum('meat','dairy','produce','bread','frozen','dry_goods','paper','chemicals','liquor','beer','wine','soda','other') NOT NULL,
	`unit` varchar(50),
	`lastPrice` decimal(10,2),
	`previousPrice` decimal(10,2),
	`priceChangePercent` decimal(5,2),
	`parLevel` int,
	`orderFrequency` enum('daily','twice_weekly','weekly','biweekly','monthly','as_needed'),
	`lastOrderedAt` timestamp,
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_products_id` PRIMARY KEY(`id`)
);
