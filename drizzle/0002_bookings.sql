CREATE TABLE IF NOT EXISTS `bookings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `guest_name` text NOT NULL,
  `phone` text NOT NULL,
  `check_in` text NOT NULL,
  `check_out` text NOT NULL,
  `adults` integer DEFAULT 1 NOT NULL,
  `children` integer DEFAULT 0 NOT NULL,
  `stay_type` text DEFAULT 'overnight' NOT NULL CHECK (`stay_type` IN ('day','overnight')),
  `checkin_time` text DEFAULT '' NOT NULL,
  `checkout_time` text DEFAULT '' NOT NULL,
  `deposit` integer DEFAULT 0 NOT NULL,
  `total` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'new' NOT NULL CHECK (`status` IN ('new','confirmed','paid','cancelled')),
  `notes` text DEFAULT '' NOT NULL,
  `source` text DEFAULT 'site' NOT NULL CHECK (`source` IN ('site','manual','whatsapp','phone')),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bookings_dates` ON `bookings` (`check_in`,`check_out`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bookings_status_check_in` ON `bookings` (`status`,`check_in`);
--> statement-breakpoint
PRAGMA optimize;
