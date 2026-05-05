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
    DocumentType NVARCHAR(20) NOT NULL DEFAULT 'ID',
    DocumentNumber NVARCHAR(50) NOT NULL,
    PhotoUrl NVARCHAR(500),
    MedicalAidInfo NVARCHAR(1000),
    Class NVARCHAR(100) NOT NULL, -- LittleLamb, EarlyBird, BusyBee, Sunbeam, Builder, HelpingHand
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    IndemnitySigned BIT NOT NULL DEFAULT 0,
    IndemnitySignedAt DATETIME2 NULL,
    IndemnitySignedByName NVARCHAR(200) NULL,
    IndemnitySignerRelationship NVARCHAR(100) NULL,
    IndemnitySignatureDataUrl NVARCHAR(MAX) NULL,
    DemeritCount INT NOT NULL DEFAULT 0,
    IsDelistedFromCamps BIT NOT NULL DEFAULT 0,
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
    EventCode NVARCHAR(20),
    IsCamp BIT NOT NULL DEFAULT 0,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
    StatusReason NVARCHAR(500),
    Date DATETIME2 NOT NULL,
    EndDate DATETIME2,
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
    ReceiptCode NVARCHAR(50),
    IsAnonymous BIT NOT NULL DEFAULT 0,
    Notes NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE DemeritRecords (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ChildId INT NOT NULL REFERENCES Children(Id) ON DELETE CASCADE,
    SubmittedByTeacherId INT NOT NULL REFERENCES Users(Id),
    ApprovedByDirectorId INT NULL REFERENCES Users(Id),
    StopRequestedById INT NULL REFERENCES Users(Id),
    StoppedByDirectorId INT NULL REFERENCES Users(Id),
    DeleteRequestedById INT NULL REFERENCES Users(Id),
    DeletedByDirectorId INT NULL REFERENCES Users(Id),
    Reason NVARCHAR(1000) NOT NULL,
    Consequence NVARCHAR(1000) NOT NULL,
    Remedy NVARCHAR(1000) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'PendingApproval',
    SubmittedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ApprovedAt DATETIME2 NULL,
    EffectiveFrom DATETIME2 NULL,
    ExpiresAt DATETIME2 NULL,
    RejectedAt DATETIME2 NULL,
    RejectionReason NVARCHAR(1000) NULL,
    StopRequestedAt DATETIME2 NULL,
    StopReason NVARCHAR(1000) NULL,
    StoppedAt DATETIME2 NULL,
    DeleteRequestedAt DATETIME2 NULL,
    DeleteReason NVARCHAR(1000) NULL,
    DeletedAt DATETIME2 NULL,
    ExpiredAt DATETIME2 NULL,
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
CREATE UNIQUE INDEX IX_Children_AdventurerCode_Unique ON Children(AdventurerCode) WHERE AdventurerCode IS NOT NULL;
CREATE INDEX IX_ProgressItems_ChildId ON ProgressItems(ChildId);
CREATE UNIQUE INDEX IX_Events_EventCode_Unique ON Events(EventCode) WHERE EventCode IS NOT NULL;
CREATE INDEX IX_Payments_UserId ON Payments(UserId);
CREATE INDEX IX_DemeritRecords_ChildId_Status ON DemeritRecords(ChildId, Status, ExpiresAt);
CREATE INDEX IX_ChatMessages_ClassRoom ON ChatMessages(ClassRoom);
CREATE INDEX IX_Announcements_TargetClass ON Announcements(TargetClass);

GO
