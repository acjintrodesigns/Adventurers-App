namespace AdventurersApi.Models;

public class HonorProgressItem {
    public int Id { get; set; }
    public int ChildId { get; set; }
    public Child? Child { get; set; }
    public string Category { get; set; } = "";
    public string HonorName { get; set; } = "";
    public bool IsCompleted { get; set; }
    public string? ProofImageUrl { get; set; }
    public int? TeacherId { get; set; }
    public DateTime? CompletedAt { get; set; }
}
