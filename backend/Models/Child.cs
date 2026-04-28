namespace AdventurersApi.Models;
public class Child {
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime DateOfBirth { get; set; }
    public string? PhotoUrl { get; set; }
    public string? MedicalAidInfo { get; set; }
    public string Class { get; set; } = ""; // LittleLamb, EarlyBird, BusyBee, Sunbeam, Builder, HelpingHand
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public int ParentId { get; set; }
    public User? Parent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
