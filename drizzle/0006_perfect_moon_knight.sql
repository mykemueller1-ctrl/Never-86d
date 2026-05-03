CREATE TABLE `notification_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetStaffId` int,
	`targetRole` varchar(50),
	`priority` varchar(20) NOT NULL DEFAULT 'normal',
	`category` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`data` json,
	`batchKey` varchar(100),
	`deliveredAt` timestamp,
	`readAt` timestamp,
	`batchedInto` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorName` varchar(255) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`previousPrice` decimal(10,2) NOT NULL,
	`currentPrice` decimal(10,2) NOT NULL,
	`changePercent` decimal(5,2) NOT NULL,
	`changeDirection` varchar(10) NOT NULL,
	`invoiceId` int,
	`flaggedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`notes` text,
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `station_broadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastType` varchar(50) NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`message` text,
	`fromStation` varchar(50) NOT NULL,
	`targetStations` json NOT NULL,
	`createdByStaffId` int,
	`createdByName` varchar(100),
	`acknowledgedBy` json DEFAULT ('[]'),
	`resolvedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `station_broadcasts_id` PRIMARY KEY(`id`)
);
