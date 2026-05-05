namespace AdventurersApi.DTOs;

public record PublicPaymentSettingsDto(
    decimal StudentRegistrationFeePrice,
    decimal TeachersRegistrationFeePrice,
    DateTime? WorkCommencmentDate,
    DateTime? WorkCompletionDate,
    DateTime? CompletionConfirmationDate,
    DateTime? InvestigerDate,
    string BankName,
    string AccountName,
    string AccountNumber,
    string BranchCode,
    bool OnlinePaymentsEnabled
);

public record AdminPaymentSettingsDto(
    decimal StudentRegistrationFeePrice,
    decimal TeachersRegistrationFeePrice,
    DateTime? WorkCommencmentDate,
    DateTime? WorkCompletionDate,
    DateTime? CompletionConfirmationDate,
    DateTime? InvestigerDate,
    string BankName,
    string AccountName,
    string AccountNumber,
    string BranchCode,
    string? PayFastMerchantId,
    string? PayFastMerchantKey,
    string? PayFastPassphrase,
    bool PayFastUseSandbox,
    string? PayFastReturnUrl,
    string? PayFastCancelUrl,
    string? PayFastNotifyUrl
);

public record UpdatePaymentSettingsDto(
    decimal? StudentRegistrationFeePrice,
    decimal? TeachersRegistrationFeePrice,
    DateTime? WorkCommencmentDate,
    DateTime? WorkCompletionDate,
    DateTime? CompletionConfirmationDate,
    DateTime? InvestigerDate,
    string BankName,
    string AccountName,
    string AccountNumber,
    string BranchCode,
    string? PayFastMerchantId,
    string? PayFastMerchantKey,
    string? PayFastPassphrase,
    bool PayFastUseSandbox,
    string? PayFastReturnUrl,
    string? PayFastCancelUrl,
    string? PayFastNotifyUrl
);
