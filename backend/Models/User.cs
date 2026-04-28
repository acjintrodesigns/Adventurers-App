namespace AdventurersApi.Models;
public class User {
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Parent"; // Director, Teacher, Parent
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
