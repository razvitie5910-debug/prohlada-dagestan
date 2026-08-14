ALTER TABLE `bookings` ADD COLUMN `residence` text DEFAULT '' NOT NULL;
--> statement-breakpoint
PRAGMA optimize;
