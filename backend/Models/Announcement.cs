namespace AdventurersApi.Models;
public class Announcement {
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public int AuthorId { get; set; }
    public User? Author { get; set; }
    public string? TargetClass { get; set; } // null = all classes
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
