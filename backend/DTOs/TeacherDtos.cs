namespace AdventurersApi.DTOs;

public record UpsertTeacherRegistrationDto(
    string FullName,
    DateTime? DateOfBirth,
    string DocumentType,
    string? DocumentNumber,
    string? Phone,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoUrl,
    string? MedicalAidInfo,
    string? UploadsJson,
    string? IndemnitySignedByName,
    string? IndemnitySignerRelationship,
    string? IndemnitySignatureDataUrl
);

public record AssignTeacherClassDto(string AssignedClass);

public record UpdateTeacherRegistrationStatusDto(string Status);
