namespace AdventurersApi.DTOs;
public record CreateEventDto(string Name, DateTime Date, DateTime? EndDate, decimal? CostPerChild, decimal? FlatCost, decimal? ExtraExpenses, string? Description, bool IsCamp = false);
public record UpdateEventDto(string Name, DateTime Date, DateTime? EndDate, decimal? CostPerChild, decimal? FlatCost, decimal? ExtraExpenses, string? Description, bool IsCamp = false);
public record EventStatusActionDto(string Reason);
