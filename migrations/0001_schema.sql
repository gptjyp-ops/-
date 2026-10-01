CREATE TABLE `members` (
	`nickname` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`mounts` integer,
	`eggs` integer,
	`skills` integer,
	`image_key` text,
	`updated_at` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`lock_until` integer DEFAULT 0 NOT NULL
);
