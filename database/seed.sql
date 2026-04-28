-- Seed data for development/testing

USE AdventurersDb;
GO

-- Insert a Director user (password: Admin123!)
INSERT INTO Users (Name, Email, PasswordHash, Role)
VALUES ('Admin Director', 'director@adventurers.org', '$2a$11$examplehashedpasswordhere', 'Director');

-- Insert a Teacher user (password: Teacher123!)
INSERT INTO Users (Name, Email, PasswordHash, Role)
VALUES ('Jane Teacher', 'teacher@adventurers.org', '$2a$11$examplehashedpasswordhere', 'Teacher');

-- Insert a Parent user (password: Parent123!)
INSERT INTO Users (Name, Email, PasswordHash, Role)
VALUES ('John Parent', 'parent@adventurers.org', '$2a$11$examplehashedpasswordhere', 'Parent');

-- Note: Replace the password hashes with real BCrypt hashes before use
-- Use the API's /api/auth/register endpoint to create real users

GO
