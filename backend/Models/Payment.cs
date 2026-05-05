namespace AdventurersApi.Models;
public class Payment {
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int? ChildId { get; set; }
    public Child? Child { get; set; }
    public int? EventId { get; set; }
    public Event? Event { get; set; }
    public decimal Amount { get; set; }
    public string Type { get; set; } = ""; // Registration, Event, Donation
    public string Status { get; set; } = "Pending"; // Pending, Completed, Failed
    public string? Reference { get; set; }
    public string? ReceiptCode { get; set; }
    public bool IsAnonymous { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
