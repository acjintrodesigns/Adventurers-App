-- Adventurers Management System Database Schema
-- SQL Server

CREATE DATABASE AdventurersDb;
GO

USE AdventurersDb;
GO

-- Users table
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(500) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'Parent', -- Director, Teacher, Parent
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Children table
CREATE TABLE Children (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    DateOfBirth DATE NOT NULL,
    PhotoUrl NVARCHAR(500),
    MedicalAidInfo NVARCHAR(1000),
    Class NVARCHAR(100) NOT NULL, -- LittleLamb, EarlyBird, BusyBee, Sunbeam, Builder, HelpingHand
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    ParentId INT NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ProgressItems table
CREATE TABLE ProgressItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ChildId INT NOT NULL REFERENCES Children(Id),
    Category NVARCHAR(100) NOT NULL, -- BasicRequirements, MyGod, MySelf, MyFamily, MyWorld
    RequirementName NVARCHAR(300) NOT NULL,
    IsCompleted BIT NOT NULL DEFAULT 0,
    ProofImageUrl NVARCHAR(500),
    TeacherId INT REFERENCES Users(Id),
    CompletedAt DATETIME2,
    CONSTRAINT UQ_ChildRequirement UNIQUE (ChildId, Category, RequirementName)
);

-- Events table
CREATE TABLE Events (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(300) NOT NULL,
    Date DATETIME2 NOT NULL,
    CostPerChild DECIMAL(10,2),
    FlatCost DECIMAL(10,2),
    ExtraExpenses DECIMAL(10,2),
    Description NVARCHAR(2000),
    DirectorId INT NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Payments table
CREATE TABLE Payments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL REFERENCES Users(Id),
    ChildId INT REFERENCES Children(Id),
    EventId INT REFERENCES Events(Id),
    Amount DECIMAL(10,2) NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- Registration, Event, Donation
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Completed, Failed
    Reference NVARCHAR(200),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ChatMessages table
CREATE TABLE ChatMessages (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ClassRoom NVARCHAR(100) NOT NULL,
    SenderId INT NOT NULL REFERENCES Users(Id),
    Message NVARCHAR(4000) NOT NULL,
    SentAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Announcements table
CREATE TABLE Announcements (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(300) NOT NULL,
    Body NVARCHAR(4000) NOT NULL,
    AuthorId INT NOT NULL REFERENCES Users(Id),
    TargetClass NVARCHAR(100), -- NULL = all classes
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes
CREATE INDEX IX_Children_ParentId ON Children(ParentId);
CREATE INDEX IX_Children_Status ON Children(Status);
CREATE INDEX IX_ProgressItems_ChildId ON ProgressItems(ChildId);
CREATE INDEX IX_Payments_UserId ON Payments(UserId);
CREATE INDEX IX_ChatMessages_ClassRoom ON ChatMessages(ClassRoom);
CREATE INDEX IX_Announcements_TargetClass ON Announcements(TargetClass);

GO
