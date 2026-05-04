CREATE TABLE `availability_windows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`preference` enum('preferred','available','unavailable') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_windows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`date` timestamp NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`position` varchar(50),
	`department` enum('bar','kitchen','driver','server','management'),
	`status` enum('scheduled','confirmed','completed','no_show','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_swap_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`targetId` int,
	`shiftId` int NOT NULL,
	`reason` text,
	`status` enum('pending','accepted','denied','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shift_swap_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`clockIn` timestamp NOT NULL,
	`clockOut` timestamp,
	`breakStarted` timestamp,
	`breakEnded` timestamp,
	`breakMinutes` int DEFAULT 0,
	`hoursWorked` decimal(5,2),
	`overtime` decimal(5,2) DEFAULT '0',
	`status` enum('clocked_in','on_break','clocked_out') NOT NULL DEFAULT 'clocked_in',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `time_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_off_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`reason` text,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `time_off_requests_id` PRIMARY KEY(`id`)
);
