namespace AdventurersApi.Models;

public class TeacherRegistration {
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    public string FullName { get; set; } = "";
    public DateTime? DateOfBirth { get; set; }
    public string DocumentType { get; set; } = "ID";
    public string? DocumentNumber { get; set; }

    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }

    public string? PhotoUrl { get; set; }
    public string? MedicalAidInfo { get; set; }
    public string? UploadsJson { get; set; }

    public bool IndemnitySigned { get; set; }
    public DateTime? IndemnitySignedAt { get; set; }
    public string? IndemnitySignedByName { get; set; }
    public string? IndemnitySignerRelationship { get; set; }
    public string? IndemnitySignatureDataUrl { get; set; }

    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public string? AssignedClass { get; set; } // one class per teacher

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
