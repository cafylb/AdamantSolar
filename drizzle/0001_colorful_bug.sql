CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`location` varchar(255) NOT NULL,
	`day` int NOT NULL,
	`month` varchar(20) NOT NULL,
	`year` int NOT NULL,
	`hour` int NOT NULL,
	`minute` int NOT NULL,
	`mainTitle` varchar(255) NOT NULL,
	`line1` varchar(255) NOT NULL,
	`line2` varchar(255) NOT NULL,
	`message` text,
	`hideTime` int NOT NULL DEFAULT 0,
	`deliveryAddress` varchar(500) NOT NULL,
	`status` enum('pending','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`location` varchar(255) NOT NULL,
	`deliveryAddress` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;