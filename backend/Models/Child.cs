namespace AdventurersApi.Models;
public class Child {
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime DateOfBirth { get; set; }
    public string DocumentType { get; set; } = "ID";
    public string DocumentNumber { get; set; } = "";
    public string? PhotoUrl { get; set; }
    public string? MedicalAidInfo { get; set; }
    public string Class { get; set; } = ""; // LittleLamb, EarlyBird, BusyBee, Sunbeam, Builder, HelpingHand
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public string? AdventurerCode { get; set; }
    public bool IndemnitySigned { get; set; } = false;
    public DateTime? IndemnitySignedAt { get; set; }
    public string? IndemnitySignedByName { get; set; }
    public string? IndemnitySignerRelationship { get; set; }
    public string? IndemnitySignatureDataUrl { get; set; }
    public int DemeritCount { get; set; } = 0;
    public bool IsDelistedFromCamps { get; set; } = false;
    public int ParentId { get; set; }
    public User? Parent { get; set; }
    public ICollection<DemeritRecord> DemeritRecords { get; set; } = new List<DemeritRecord>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
