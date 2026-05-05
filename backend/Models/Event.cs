namespace AdventurersApi.Models;
public class Event {
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? EventCode { get; set; }
    public bool IsCamp { get; set; }
    public string Status { get; set; } = "Active";
    public string? StatusReason { get; set; }
    public DateTime Date { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? CostPerChild { get; set; }
    public decimal? FlatCost { get; set; }
    public decimal? ExtraExpenses { get; set; }
    public string? Description { get; set; }
    public int DirectorId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
