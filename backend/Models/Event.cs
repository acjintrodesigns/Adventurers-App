namespace AdventurersApi.Models;
public class Event {
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime Date { get; set; }
    public decimal? CostPerChild { get; set; }
    public decimal? FlatCost { get; set; }
    public decimal? ExtraExpenses { get; set; }
    public string? Description { get; set; }
    public int DirectorId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
