CREATE TABLE `management_briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetRole` varchar(50) NOT NULL,
	`briefingType` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`summary` text NOT NULL,
	`fullContent` text NOT NULL,
	`dataSnapshot` json,
	`weatherContext` json,
	`eventsContext` json,
	`salesTrends` json,
	`anomalies` json,
	`theories` json,
	`actionItems` json,
	`notificationSent` boolean DEFAULT false,
	`readAt` timestamp,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `management_briefings_id` PRIMARY KEY(`id`)
);
