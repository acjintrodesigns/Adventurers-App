namespace AdventurersApi.Models;

public class LockedTopic {
    public int Id { get; set; }
    public int ChildId { get; set; }
    public string Section { get; set; } = "";
    public string Topic { get; set; } = "";
    public int LockedByTeacherId { get; set; }
    public DateTime LockedAt { get; set; } = DateTime.UtcNow;
    public Child Child { get; set; } = null!;
}
