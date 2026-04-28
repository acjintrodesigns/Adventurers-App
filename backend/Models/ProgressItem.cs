namespace AdventurersApi.Models;
public class ProgressItem {
    public int Id { get; set; }
    public int ChildId { get; set; }
    public Child? Child { get; set; }
    public string Category { get; set; } = ""; // BasicRequirements, MyGod, MySelf, MyFamily, MyWorld
    public string RequirementName { get; set; } = "";
    public bool IsCompleted { get; set; }
    public string? ProofImageUrl { get; set; }
    public int? TeacherId { get; set; }
    public DateTime? CompletedAt { get; set; }
}
