namespace AdventurersApi.DTOs;
public record CreateChildDto(string Name, DateTime DateOfBirth, string? Gender, string Class, string DocumentType, string DocumentNumber, string? MedicalAidInfo, string? PhotoUrl);
public record UpdateChildStatusDto(string Status);
public record UpdateChildIndemnityDto(string FullName, string Relationship, string SignatureDataUrl);
public record SaveIndemnitySignatureDto(string? FullName, string? Relationship, string SignatureDataUrl);
