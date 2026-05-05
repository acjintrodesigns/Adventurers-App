namespace AdventurersApi.Models;
public class User {
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Parent"; // Director, Teacher, Parent
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Profile fields (optional — collected after first login)
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Relationship { get; set; } // Mother, Father, Guardian, Other
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? PhotoUrl { get; set; } // Profile picture (data URL)
    // Additional guardians stored as a JSON array string
    public string? SecondaryGuardianJson { get; set; }
}
