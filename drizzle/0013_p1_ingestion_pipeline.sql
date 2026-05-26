CREATE TABLE `scheduled_job_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(120) NOT NULL,
	`runId` varchar(120) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`status` enum('running','success','partial','failed') NOT NULL DEFAULT 'running',
	`sourceCounts` json,
	`insertedCounts` json,
	`updatedCounts` json,
	`deadLetterCounts` json,
	`errorSummary` text,
	`nextAction` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_job_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduled_job_runs_runId_unique` UNIQUE(`runId`)
);
--> statement-breakpoint
CREATE TABLE `source_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorName` varchar(200) NOT NULL,
	`sourceProvider` enum('gmail','outlook') NOT NULL,
	`senderEmail` varchar(320) NOT NULL,
	`subjectPattern` varchar(500),
	`attachmentType` varchar(100),
	`frequency` varchar(120),
	`lastSeenAt` timestamp,
	`status` enum('active','paused','needs_review','disabled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingestion_dead_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(120) NOT NULL,
	`runId` varchar(120) NOT NULL,
	`sourceProvider` enum('gmail','outlook','manual','unknown'),
	`sourceMailbox` varchar(320),
	`sourceMessageId` varchar(255),
	`sourceAttachmentHash` varchar(128),
	`vendorName` varchar(200),
	`parserName` varchar(120),
	`parserVersion` varchar(50),
	`errorSummary` text,
	`rawText` text,
	`payload` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ingestion_dead_letters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `sourceProvider` enum('gmail','outlook','manual','unknown');
--> statement-breakpoint
ALTER TABLE `invoices` ADD `sourceMailbox` varchar(320);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `sourceMessageId` varchar(255);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `sourceAttachmentHash` varchar(128);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `parserVersion` varchar(50);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `parserConfidence` decimal(4,3);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `dedupeKey` varchar(255);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `needsReview` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `invoices` ADD `rawText` text;
--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_dedupeKey_unique` UNIQUE(`dedupeKey`);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `sourceProvider` enum('gmail','manual','unknown');
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `sourceMailbox` varchar(320);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `sourceMessageId` varchar(255);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `sourceAttachmentHash` varchar(128);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `parserVersion` varchar(50);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `parserConfidence` decimal(4,3);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `dedupeKey` varchar(255);
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `needsReview` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD `rawText` text;
--> statement-breakpoint
ALTER TABLE `daily_sales` ADD CONSTRAINT `daily_sales_dedupeKey_unique` UNIQUE(`dedupeKey`);
