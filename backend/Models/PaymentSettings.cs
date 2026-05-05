namespace AdventurersApi.Models;

public class PaymentSettings {
    public int Id { get; set; }

    // Director pricing.costs and learning timeline (global club-wide settings)
    public decimal StudentRegistrationFeePrice { get; set; } = 450m;
    public decimal TeachersRegistrationFeePrice { get; set; } = 450m;
    public DateTime? WorkCommencmentDate { get; set; }
    public DateTime? WorkCompletionDate { get; set; }
    public DateTime? CompletionConfirmationDate { get; set; }
    public DateTime? InvestigerDate { get; set; }

    // Bank transfer details shown to parents.
    public string BankName { get; set; } = "First National Bank";
    public string AccountName { get; set; } = "Bassonia Adventurer Club";
    public string AccountNumber { get; set; } = "XXXX XXXX XXXX";
    public string BranchCode { get; set; } = "250655";

    // Online payment gateway details.
    public string? PayFastMerchantId { get; set; }
    public string? PayFastMerchantKey { get; set; }
    public string? PayFastPassphrase { get; set; }
    public bool PayFastUseSandbox { get; set; } = true;
    public string? PayFastReturnUrl { get; set; }
    public string? PayFastCancelUrl { get; set; }
    public string? PayFastNotifyUrl { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
