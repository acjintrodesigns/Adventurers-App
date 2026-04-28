# Database Setup

## Prerequisites
- SQL Server 2019+ or Azure SQL Database

## Setup

1. Connect to your SQL Server instance
2. Run `schema.sql` to create the database and tables
3. Optionally run `seed.sql` for test data (update password hashes first)

## Connection String

```
Server=localhost;Database=AdventurersDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True
```

## EF Core Migrations

Migrations are managed in the backend project:

```bash
cd ../backend
dotnet ef migrations add InitialCreate
dotnet ef database update
```
