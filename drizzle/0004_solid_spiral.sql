CREATE TABLE `intelligence_anomalies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anomalyType` varchar(100) NOT NULL,
	`severity` enum('high','medium','low') NOT NULL,
	`employeeName` varchar(200),
	`detail` text NOT NULL,
	`theory` text,
	`businessDate` varchar(20),
	`acknowledged` boolean DEFAULT false,
	`acknowledgedBy` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `intelligence_anomalies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `local_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(500) NOT NULL,
	`eventDate` varchar(20) NOT NULL,
	`eventTime` varchar(50),
	`venue` varchar(300),
	`city` varchar(100),
	`distance` decimal(5,1),
	`category` enum('sports','school','community','concert','festival','holiday','other') DEFAULT 'other',
	`estimatedImpact` enum('high','medium','low') DEFAULT 'low',
	`attendanceEstimate` int,
	`notes` text,
	`source` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `local_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_mix_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodStart` varchar(20) NOT NULL,
	`periodEnd` varchar(20) NOT NULL,
	`itemName` varchar(300) NOT NULL,
	`itemId` varchar(20),
	`category` enum('food','pizza','beer','liquor','pop','other') DEFAULT 'other',
	`totalAmount` decimal(10,2),
	`totalQty` int,
	`sourceFile` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_mix_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStart` varchar(20) NOT NULL,
	`weekEnd` varchar(20) NOT NULL,
	`recommendations` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedBy` varchar(200),
	CONSTRAINT `schedule_intelligence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `void_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessDate` varchar(20) NOT NULL,
	`orderId` varchar(20),
	`recordType` enum('void_item','void_order') NOT NULL,
	`itemType` varchar(50),
	`itemDesc` varchar(300),
	`employeeName` varchar(200),
	`amount` decimal(10,2),
	`timeIn` varchar(50),
	`timeApplied` varchar(50),
	`reason` text,
	`sourceFile` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `void_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weather_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(20) NOT NULL,
	`tempMax` decimal(5,1),
	`tempMin` decimal(5,1),
	`precipitation` decimal(6,2),
	`snowfall` decimal(6,2),
	`windMax` decimal(5,1),
	`weatherCode` int,
	`isForecast` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weather_data_id` PRIMARY KEY(`id`)
);
