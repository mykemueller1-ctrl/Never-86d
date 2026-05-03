CREATE TABLE `checklist_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`staffId` int NOT NULL,
	`date` timestamp NOT NULL,
	`completedItems` json,
	`totalTimeSeconds` int,
	`percentComplete` int NOT NULL DEFAULT 0,
	`flaggedRush` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklist_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`department` enum('bar','kitchen','driver','server','all') NOT NULL,
	`type` enum('opening','closing','weekly','daily') NOT NULL,
	`items` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`salesYesterday` decimal(10,2),
	`ordersYesterday` int,
	`eightySixedItems` json,
	`specials` json,
	`openIssues` json,
	`shoutouts` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_briefings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`date` timestamp NOT NULL,
	`totalDeliveries` int NOT NULL DEFAULT 0,
	`outOfTownRuns` json,
	`specialRuns` json,
	`cashFromTill` decimal(10,2),
	`cashReason` text,
	`redeliveries` json,
	`totalTips` decimal(10,2),
	`managerHandedCash` boolean NOT NULL DEFAULT false,
	`handedByStaffId` int,
	`flagged` boolean NOT NULL DEFAULT false,
	`flagReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`date` timestamp NOT NULL,
	`shiftType` enum('open','mid','close'),
	`rating` int,
	`comment` text,
	`category` enum('equipment','staffing','inventory','customer','management','other'),
	`urgency` enum('low','medium','high','critical'),
	`resolved` boolean NOT NULL DEFAULT false,
	`resolvedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gamification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`date` timestamp NOT NULL,
	`eventType` enum('checklist_complete','zero_void_week','on_time_streak','social_post','social_engagement','customer_review_mention','training_mentor','feedback_submitted','void_deduction','break_violation','wifi_disconnect') NOT NULL,
	`points` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gamification_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorName` varchar(200) NOT NULL,
	`vendorAddress` text,
	`vendorPhone` varchar(20),
	`invoiceNumber` varchar(50),
	`date` timestamp NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`category` enum('meat','bread','produce','liquor','beer','supplies','misc') NOT NULL,
	`items` json,
	`receiptPhotoUrl` text,
	`orderedById` int,
	`receivedById` int,
	`flagged` boolean NOT NULL DEFAULT false,
	`flagReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportedById` int NOT NULL,
	`date` timestamp NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`category` enum('equipment','plumbing','electrical','inventory','safety','pest','other') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL,
	`status` enum('open','in_progress','resolved','wont_fix') NOT NULL DEFAULT 'open',
	`photoUrl` text,
	`resolvedById` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`authorizedById` int,
	`date` timestamp NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` text,
	`category` enum('store_run','supplies','bread','meat','produce','miscellaneous','driver_payout','redelivery','other') NOT NULL,
	`vendor` varchar(200),
	`receiptPhotoUrl` text,
	`posPayoutAmount` decimal(10,2),
	`discrepancy` decimal(10,2),
	`flagged` boolean NOT NULL DEFAULT false,
	`flagReason` text,
	`managerReviewed` boolean NOT NULL DEFAULT false,
	`reviewedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`employeeNumber` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`department` enum('bar','kitchen','driver','server','management') NOT NULL,
	`jobRole` enum('owner','key_manager','kitchen_manager','kitchen_key','bartender','bar_manager','server','driver','line_cook','pizza') NOT NULL,
	`isKeyEmployee` boolean NOT NULL DEFAULT false,
	`canAuthPayouts` boolean NOT NULL DEFAULT false,
	`pin` varchar(10),
	`status` enum('active','inactive','terminated') NOT NULL DEFAULT 'active',
	`hireDate` timestamp,
	`lastClockIn` timestamp,
	`totalPoints` int NOT NULL DEFAULT 0,
	`currentStreak` int NOT NULL DEFAULT 0,
	`weeklyVoids` int NOT NULL DEFAULT 0,
	`schedulePriority` int NOT NULL DEFAULT 50,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`date` timestamp NOT NULL,
	`orderNumber` varchar(20),
	`type` enum('void','comp','promo','discount','credit') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reason` text NOT NULL,
	`managerNotified` boolean NOT NULL DEFAULT false,
	`managerApproved` boolean NOT NULL DEFAULT false,
	`approvedById` int,
	`flagged` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voids_id` PRIMARY KEY(`id`)
);
