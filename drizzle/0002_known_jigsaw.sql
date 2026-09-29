CREATE TABLE `bucket_members` (
	`bucket_key` text NOT NULL,
	`course_code` text NOT NULL,
	PRIMARY KEY(`bucket_key`, `course_code`)
);
--> statement-breakpoint
CREATE TABLE `buckets` (
	`key` text PRIMARY KEY NOT NULL,
	`program_code` text NOT NULL,
	`label` text NOT NULL,
	`min_units` integer NOT NULL,
	`cap_units` integer NOT NULL,
	`kind` text NOT NULL,
	`mode` text NOT NULL,
	`exclusive` integer DEFAULT false NOT NULL,
	`subjects` text DEFAULT '' NOT NULL,
	`min_level` integer,
	`max_level` integer,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`units` integer NOT NULL,
	`subject` text NOT NULL,
	`level` integer NOT NULL,
	`requisite_note` text DEFAULT '' NOT NULL,
	`needs_permission_code` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offerings` (
	`course_code` text NOT NULL,
	`session` text NOT NULL,
	PRIMARY KEY(`course_code`, `session`)
);
--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`course_code` text NOT NULL,
	`term` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`program_code` text NOT NULL,
	`specialisation_key` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_slug_unique` ON `plans` (`slug`);--> statement-breakpoint
CREATE TABLE `prereq_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_code` text NOT NULL,
	`concurrent` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prereq_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`course_code` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seed_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `specialisation_members` (
	`specialisation_key` text NOT NULL,
	`course_code` text NOT NULL,
	PRIMARY KEY(`specialisation_key`, `course_code`)
);
--> statement-breakpoint
CREATE TABLE `specialisations` (
	`key` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL
);
