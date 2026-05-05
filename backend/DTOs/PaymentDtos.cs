namespace AdventurersApi.DTOs;
public record CreatePaymentDto(int? ChildId, int? EventId, decimal Amount, string Type, bool IsAnonymous = false, string? Notes = null);
public record CreatePayFastCheckoutDto(int? ChildId, int? EventId, decimal Amount, string Type, string? ItemName, bool IsAnonymous = false, string? Notes = null);
public record CheckoutUrlDto(string CheckoutUrl, string Reference, int PaymentId);
