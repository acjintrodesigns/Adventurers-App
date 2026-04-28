using Microsoft.EntityFrameworkCore;
using AdventurersApi.Models;

namespace AdventurersApi.Data;
public class AppDbContext : DbContext {
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}
    public DbSet<User> Users { get; set; }
    public DbSet<Child> Children { get; set; }
    public DbSet<ProgressItem> ProgressItems { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<Announcement> Announcements { get; set; }
}
