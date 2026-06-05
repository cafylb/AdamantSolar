# Database Management Commands

## Available Commands

All database commands are available via npm scripts:

### `npm run db:create`
- **Description**: Creates or restores the database schema
- **Use case**: Initialize a fresh database from scratch
- **Output**: Creates `users`, `userProfiles`, and `orders` tables with proper indexes and constraints

### `npm run db:clear`
- **Description**: Clears the entire database (drops all tables)
- **Use case**: Complete database reset while keeping the schema
- **Warning**: ⚠️ This deletes ALL data permanently!

### `npm run db:clear:orders`
- **Description**: Clears only the orders table
- **Use case**: Remove all orders while keeping users and profiles
- **Returns**: Number of deleted orders

### `npm run db:clear:users`
- **Description**: Clears the users table (cascades to orders and profiles)
- **Use case**: Remove all users and their related data
- **Returns**: Number of deleted users

### `npm run db:reset`
- **Description**: Complete database reset (clear + create)
- **Use case**: Start with a completely fresh database
- **Workflow**: 
  1. Drops all tables
  2. Recreates schema with all tables and indexes

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `openId` (VARCHAR UNIQUE) - OAuth identifier
- `name` (TEXT)
- `email` (VARCHAR)
- `loginMethod` (VARCHAR)
- `role` (VARCHAR) - Default: 'user'
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)
- `lastSignedIn` (TIMESTAMP)

### User Profiles Table
- `id` (SERIAL PRIMARY KEY)
- `userId` (INTEGER FK -> users)
- `location` (VARCHAR)
- `deliveryAddress` (VARCHAR)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Orders Table
- `id` (SERIAL PRIMARY KEY)
- `userId` (INTEGER FK -> users)
- `location` (VARCHAR)
- `day`, `month`, `year`, `hour`, `minute` (DateTime fields)
- `mainTitle`, `line1`, `line2` (VARCHAR)
- `message` (TEXT)
- `contactNumber` (VARCHAR)
- `hideTime` (BOOLEAN)
- `deliveryAddress` (VARCHAR)
- `status` (VARCHAR) - Default: 'pending'
- `createdAt`, `updatedAt` (TIMESTAMP)

## Configuration

Database connection is configured via `.env` file:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/solar
```

## Requirements

- PostgreSQL running and accessible
- `.env` file with `DATABASE_URL` configured
- Node.js with npm/pnpm installed

## Quick Start Workflow

```bash
# Start fresh
npm run db:reset

# Clear only orders
npm run db:clear:orders

# Clear only users
npm run db:clear:users

# Create schema (if tables don't exist)
npm run db:create
```

## Troubleshooting

- **Error: DATABASE_URL is not set**: Make sure `.env` file exists and has `DATABASE_URL` configured
- **Error: Connection refused**: Verify PostgreSQL is running on localhost:5432
- **Error: Unknown database**: Database will be created automatically

All commands use TSX for TypeScript execution and automatically handle connection pooling and cleanup.
