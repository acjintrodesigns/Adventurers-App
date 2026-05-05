using Microsoft.EntityFrameworkCore;
using AdventurersApi.Models;

namespace AdventurersApi.Data;
public class AppDbContext : DbContext {
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}
    public DbSet<User> Users { get; set; }
    public DbSet<Child> Children { get; set; }
    public DbSet<DemeritRecord> DemeritRecords { get; set; }
    public DbSet<ProgressItem> ProgressItems { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<PaymentSettings> PaymentSettings { get; set; }
    public DbSet<TeacherRegistration> TeacherRegistrations { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<Announcement> Announcements { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.Child)
            .WithMany(child => child.DemeritRecords)
            .HasForeignKey(record => record.ChildId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.SubmittedByTeacher)
            .WithMany()
            .HasForeignKey(record => record.SubmittedByTeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.ApprovedByDirector)
            .WithMany()
            .HasForeignKey(record => record.ApprovedByDirectorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.StopRequestedBy)
            .WithMany()
            .HasForeignKey(record => record.StopRequestedById)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.StoppedByDirector)
            .WithMany()
            .HasForeignKey(record => record.StoppedByDirectorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.DeleteRequestedBy)
            .WithMany()
            .HasForeignKey(record => record.DeleteRequestedById)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DemeritRecord>()
            .HasOne(record => record.DeletedByDirector)
            .WithMany()
            .HasForeignKey(record => record.DeletedByDirectorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TeacherRegistration>()
            .HasOne(registration => registration.User)
            .WithOne()
            .HasForeignKey<TeacherRegistration>(registration => registration.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TeacherRegistration>()
            .HasIndex(registration => registration.UserId)
            .IsUnique();
    }
}
