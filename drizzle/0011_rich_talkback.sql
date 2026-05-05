ALTER TABLE `staff` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `staff` ADD `facebookId` varchar(100);--> statement-breakpoint
ALTER TABLE `staff` ADD `facebookAccessToken` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `profilePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `lastLoginMethod` enum('pin','email','facebook');