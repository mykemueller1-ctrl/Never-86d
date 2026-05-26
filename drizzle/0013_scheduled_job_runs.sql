CREATE TABLE `scheduled_job_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(120) NOT NULL,
	`idempotencyKey` varchar(191),
	`status` enum('running','success','failed','skipped') NOT NULL DEFAULT 'running',
	`trigger` enum('scheduled','manual','api') NOT NULL DEFAULT 'scheduled',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`durationMs` int,
	`summary` json,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_job_runs_id` PRIMARY KEY(`id`)
);
