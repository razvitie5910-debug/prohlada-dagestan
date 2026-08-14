CREATE TABLE IF NOT EXISTS `pricing_settings` (
  `id` integer PRIMARY KEY NOT NULL,
  `day_price` integer DEFAULT 15000 NOT NULL,
  `overnight_price` integer DEFAULT 15000 NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `pricing_settings` (`id`, `day_price`, `overnight_price`, `updated_at`) VALUES (1, 15000, 15000, datetime('now'));
--> statement-breakpoint
PRAGMA optimize;