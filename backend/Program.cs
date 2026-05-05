using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using AdventurersApi.Data;
using AdventurersApi.Hubs;
using AdventurersApi.Models;
using AdventurersApi.Services;

var builder = WebApplication.CreateBuilder(args);

// EF Core with SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
        // Allow JWT via query string for SignalR
        options.Events = new JwtBearerEvents {
            OnMessageReceived = context => {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options => {
    options.AddPolicy("FrontendPolicy", policy => {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// SignalR
builder.Services.AddSignalR();

// Controllers
builder.Services.AddControllers();

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Adventurers API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        Description = "JWT Authorization header. Enter: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Application services
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<DemeritService>();

var app = builder.Build();

// Ensure payment settings table and adventurer code schema updates exist.
using (var scope = app.Services.CreateScope()) {
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var bootstrapSql = @"
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PaymentSettings'
)
BEGIN
    CREATE TABLE PaymentSettings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankName NVARCHAR(200) NOT NULL,
        AccountName NVARCHAR(200) NOT NULL,
        AccountNumber NVARCHAR(100) NOT NULL,
        BranchCode NVARCHAR(50) NOT NULL,
        PayFastMerchantId NVARCHAR(100) NULL,
        PayFastMerchantKey NVARCHAR(100) NULL,
        PayFastPassphrase NVARCHAR(200) NULL,
        PayFastUseSandbox BIT NOT NULL DEFAULT 1,
        PayFastReturnUrl NVARCHAR(500) NULL,
        PayFastCancelUrl NVARCHAR(500) NULL,
        PayFastNotifyUrl NVARCHAR(500) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END

IF COL_LENGTH('dbo.Children', 'AdventurerCode') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD AdventurerCode NVARCHAR(50) NULL;
END

IF COL_LENGTH('dbo.Children', 'DocumentType') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD DocumentType NVARCHAR(20) NOT NULL CONSTRAINT DF_Children_DocumentType DEFAULT 'ID';
END

IF COL_LENGTH('dbo.Children', 'DocumentNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD DocumentNumber NVARCHAR(50) NOT NULL CONSTRAINT DF_Children_DocumentNumber DEFAULT '';
END

IF COL_LENGTH('dbo.Children', 'IndemnitySigned') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD IndemnitySigned BIT NOT NULL CONSTRAINT DF_Children_IndemnitySigned DEFAULT 0;
END

IF COL_LENGTH('dbo.Children', 'IndemnitySignedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD IndemnitySignedAt DATETIME2 NULL;
END

IF COL_LENGTH('dbo.Children', 'IndemnitySignedByName') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD IndemnitySignedByName NVARCHAR(200) NULL;
END

IF COL_LENGTH('dbo.Children', 'IndemnitySignerRelationship') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD IndemnitySignerRelationship NVARCHAR(100) NULL;
END

IF COL_LENGTH('dbo.Children', 'IndemnitySignatureDataUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD IndemnitySignatureDataUrl NVARCHAR(MAX) NULL;
END

IF COL_LENGTH('dbo.Children', 'DemeritCount') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD DemeritCount INT NOT NULL CONSTRAINT DF_Children_DemeritCount DEFAULT 0;
END

IF COL_LENGTH('dbo.Children', 'IsDelistedFromCamps') IS NULL
BEGIN
    ALTER TABLE dbo.Children ADD IsDelistedFromCamps BIT NOT NULL CONSTRAINT DF_Children_IsDelistedFromCamps DEFAULT 0;
END

IF COL_LENGTH('dbo.Events', 'EventCode') IS NULL
BEGIN
    ALTER TABLE dbo.Events ADD EventCode NVARCHAR(20) NULL;
END

IF COL_LENGTH('dbo.Events', 'IsCamp') IS NULL
BEGIN
    ALTER TABLE dbo.Events ADD IsCamp BIT NOT NULL CONSTRAINT DF_Events_IsCamp DEFAULT 0;
END

IF COL_LENGTH('dbo.Events', 'Status') IS NULL
BEGIN
    ALTER TABLE dbo.Events ADD Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Events_Status DEFAULT 'Active';
END

IF COL_LENGTH('dbo.Events', 'StatusReason') IS NULL
BEGIN
    ALTER TABLE dbo.Events ADD StatusReason NVARCHAR(500) NULL;
END

IF COL_LENGTH('dbo.Events', 'EndDate') IS NULL
BEGIN
    ALTER TABLE dbo.Events ADD EndDate DATETIME2 NULL;
END

IF COL_LENGTH('dbo.Payments', 'ReceiptCode') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD ReceiptCode NVARCHAR(50) NULL;
END

IF COL_LENGTH('dbo.Payments', 'IsAnonymous') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD IsAnonymous BIT NOT NULL DEFAULT 0;
END

IF COL_LENGTH('dbo.Payments', 'Notes') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD Notes NVARCHAR(500) NULL;
END

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DemeritRecords'
)
BEGIN
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
        Status NVARCHAR(50) NOT NULL CONSTRAINT DF_DemeritRecords_Status DEFAULT 'PendingApproval',
        SubmittedAt DATETIME2 NOT NULL CONSTRAINT DF_DemeritRecords_SubmittedAt DEFAULT SYSUTCDATETIME(),
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
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DemeritRecords_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_DemeritRecords_ChildId_Status' AND object_id = OBJECT_ID('dbo.DemeritRecords')
)
BEGIN
    CREATE INDEX IX_DemeritRecords_ChildId_Status ON dbo.DemeritRecords (ChildId, Status, ExpiresAt);
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Children_AdventurerCode_Unique'
      AND object_id = OBJECT_ID('dbo.Children')
)
BEGIN
    CREATE UNIQUE INDEX IX_Children_AdventurerCode_Unique
    ON dbo.Children (AdventurerCode)
    WHERE AdventurerCode IS NOT NULL;
END";

    bootstrapSql += @"

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Events_EventCode_Unique'
      AND object_id = OBJECT_ID('dbo.Events')
)
BEGIN
    CREATE UNIQUE INDEX IX_Events_EventCode_Unique
    ON dbo.Events (EventCode)
    WHERE EventCode IS NOT NULL;
END

IF COL_LENGTH('dbo.Users', 'Phone') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Phone NVARCHAR(50) NULL;
END

IF COL_LENGTH('dbo.Users', 'Address') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Address NVARCHAR(500) NULL;
END

IF COL_LENGTH('dbo.Users', 'Relationship') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Relationship NVARCHAR(50) NULL;
END

IF COL_LENGTH('dbo.Users', 'EmergencyContactName') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD EmergencyContactName NVARCHAR(200) NULL;
END

IF COL_LENGTH('dbo.Users', 'EmergencyContactPhone') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD EmergencyContactPhone NVARCHAR(50) NULL;
END";

    try {
        db.Database.EnsureCreated();

        // SQLite column migrations (EnsureCreated won't add new columns to existing tables)
        if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite") {
            try { db.Database.ExecuteSqlRaw("ALTER TABLE Users ADD COLUMN SecondaryGuardianJson TEXT NULL"); } catch { /* column already exists */ }
            try { db.Database.ExecuteSqlRaw("ALTER TABLE Users ADD COLUMN PhotoUrl TEXT NULL"); } catch { /* column already exists */ }

            try { db.Database.ExecuteSqlRaw("ALTER TABLE PaymentSettings ADD COLUMN StudentRegistrationFeePrice REAL NOT NULL DEFAULT 450"); } catch { /* column already exists */ }
            try { db.Database.ExecuteSqlRaw("ALTER TABLE PaymentSettings ADD COLUMN TeachersRegistrationFeePrice REAL NOT NULL DEFAULT 450"); } catch { /* column already exists */ }
            try { db.Database.ExecuteSqlRaw("ALTER TABLE PaymentSettings ADD COLUMN WorkCommencmentDate TEXT NULL"); } catch { /* column already exists */ }
            try { db.Database.ExecuteSqlRaw("ALTER TABLE PaymentSettings ADD COLUMN WorkCompletionDate TEXT NULL"); } catch { /* column already exists */ }
            try { db.Database.ExecuteSqlRaw("ALTER TABLE PaymentSettings ADD COLUMN CompletionConfirmationDate TEXT NULL"); } catch { /* column already exists */ }
            try { db.Database.ExecuteSqlRaw("ALTER TABLE PaymentSettings ADD COLUMN InvestigerDate TEXT NULL"); } catch { /* column already exists */ }

            db.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS TeacherRegistrations (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    FullName TEXT NOT NULL,
    DateOfBirth TEXT NULL,
    DocumentType TEXT NOT NULL DEFAULT 'ID',
    DocumentNumber TEXT NULL,
    Phone TEXT NULL,
    Address TEXT NULL,
    EmergencyContactName TEXT NULL,
    EmergencyContactPhone TEXT NULL,
    PhotoUrl TEXT NULL,
    MedicalAidInfo TEXT NULL,
    UploadsJson TEXT NULL,
    IndemnitySigned INTEGER NOT NULL DEFAULT 0,
    IndemnitySignedAt TEXT NULL,
    IndemnitySignedByName TEXT NULL,
    IndemnitySignerRelationship TEXT NULL,
    IndemnitySignatureDataUrl TEXT NULL,
    Status TEXT NOT NULL DEFAULT 'Pending',
    AssignedClass TEXT NULL,
    CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UpdatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    FOREIGN KEY(UserId) REFERENCES Users(Id) ON DELETE CASCADE
);");

            db.Database.ExecuteSqlRaw("CREATE UNIQUE INDEX IF NOT EXISTS IX_TeacherRegistrations_UserId ON TeacherRegistrations(UserId)");
        }

        // Seed default users if the database is empty
        if (!db.Users.Any()) {
            db.Users.AddRange(
                new User {
                    Name = "Director Admin",
                    Email = "director@adventurers.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Director@123"),
                    Role = "Director",
                },
                new User {
                    Name = "Test Parent",
                    Email = "parent@adventurers.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Parent@123"),
                    Role = "Parent",
                }
            );
            db.SaveChanges();
        }

        // Backfill teacher registrations for any existing Teacher users.
        var teacherUsers = db.Users.Where(u => u.Role == "Teacher").ToList();
        foreach (var teacherUser in teacherUsers) {
            if (db.TeacherRegistrations.Any(reg => reg.UserId == teacherUser.Id))
                continue;

            db.TeacherRegistrations.Add(new TeacherRegistration {
                UserId = teacherUser.Id,
                FullName = teacherUser.Name,
                Phone = teacherUser.Phone,
                Address = teacherUser.Address,
                EmergencyContactName = teacherUser.EmergencyContactName,
                EmergencyContactPhone = teacherUser.EmergencyContactPhone,
                PhotoUrl = teacherUser.PhotoUrl,
                Status = "Pending",
            });
        }

        if (db.ChangeTracker.HasChanges())
            db.SaveChanges();

            // Only run SQL Server-specific DDL when not using SQLite
            if (db.Database.ProviderName != "Microsoft.EntityFrameworkCore.Sqlite") {
                db.Database.ExecuteSqlRaw(bootstrapSql);
            }
        } catch (Exception) {
            // Ignore bootstrap errors so app can still run where DB permissions are restricted.
        }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Adventurers API v1"));
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
