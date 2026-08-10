CREATE TABLE IF NOT EXISTS `availability` (
	`date` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL CHECK (`status` IN ('available', 'booked', 'closed')),
	`updated_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA optimize;
