namespace AdventurersApi.DTOs;
public record CreateEventDto(string Name, DateTime Date, decimal? CostPerChild, decimal? FlatCost, decimal? ExtraExpenses, string? Description);
