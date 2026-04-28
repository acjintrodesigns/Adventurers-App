namespace AdventurersApi.DTOs;
public record CreateChildDto(string Name, DateTime DateOfBirth, string Class, string? MedicalAidInfo);
public record UpdateChildStatusDto(string Status);
