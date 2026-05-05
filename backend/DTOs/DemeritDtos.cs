namespace AdventurersApi.DTOs;

public record CreateDemeritDto(string Reason, string Consequence, string Remedy);
public record DemeritApprovalDto(string? Consequence, string? Remedy, string? Note);
public record DemeritDecisionDto(string? Note);
public record DemeritActionRequestDto(string Reason);