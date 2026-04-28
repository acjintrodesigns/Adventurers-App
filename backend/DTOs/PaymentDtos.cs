namespace AdventurersApi.DTOs;
public record CreatePaymentDto(int? ChildId, int? EventId, decimal Amount, string Type);
