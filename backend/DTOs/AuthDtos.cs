namespace AdventurersApi.DTOs;
public record RegisterDto(string Name, string Email, string Password, string Role);
public record LoginDto(string Email, string Password);
public record AuthResponseDto(string Token, string Role, string Name);

public record UpdateProfileDto(
    string? Name,
    string? Phone,
    string? Address,
    string? Relationship,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoUrl,
    string? SecondaryGuardianJson
);

public record ProfileResponseDto(
    int Id,
    string Name,
    string Email,
    string Role,
    string? Phone,
    string? Address,
    string? Relationship,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    DateTime CreatedAt,
    string? PhotoUrl,
    string? SecondaryGuardianJson
);
