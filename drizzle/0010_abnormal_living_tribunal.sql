CREATE TABLE `security_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('login_success','login_failed','lockout_triggered','lockout_expired','pin_changed','pin_change_failed','clock_in','clock_out','unauthorized_access','prompt_injection_blocked','staff_created','staff_deactivated') NOT NULL,
	`staffId` int,
	`staffName` varchar(200),
	`ipAddress` varchar(45) NOT NULL,
	`userAgent` varchar(500),
	`details` text,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`resolved` boolean NOT NULL DEFAULT false,
	`resolvedBy` varchar(200),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_events_id` PRIMARY KEY(`id`)
);
