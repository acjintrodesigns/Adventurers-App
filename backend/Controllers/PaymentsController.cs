using System.Data;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;
using AdventurersApi.Services;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly DemeritService _demeritService;

    public PaymentsController(AppDbContext db, IConfiguration config, DemeritService demeritService) {
        _db = db;
        _config = config;
        _demeritService = demeritService;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserRole() =>
        User.FindFirstValue(ClaimTypes.Role)!;

    private sealed class EffectivePayFastSettings {
        public required string MerchantId { get; init; }
        public required string MerchantKey { get; init; }
        public string? Passphrase { get; init; }
        public bool UseSandbox { get; init; }
        public required string ReturnUrl { get; init; }
        public required string CancelUrl { get; init; }
        public required string NotifyUrl { get; init; }
    }

    // GET /api/payments
    // Directors see all; Parents see their own.
    [HttpGet]
    public async Task<IActionResult> GetPayments() {
        var role = GetUserRole();
        var userId = GetUserId();

        var query = _db.Payments
            .Include(p => p.User)
            .Include(p => p.Child)
            .Include(p => p.Event)
            .AsQueryable();

        if (role == "Parent")
            query = query.Where(p => p.UserId == userId);

        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new {
                p.Id, p.UserId, UserName = p.User!.Name,
                p.ChildId, ChildName = p.Child != null ? p.Child.Name : null,
                ChildAdventurerCode = p.Child != null ? p.Child.AdventurerCode : null,
                p.EventId, EventName = p.Event != null ? p.Event.Name : null,
                p.Amount, p.Type, p.Status, p.Reference, p.ReceiptCode, p.IsAnonymous, p.Notes, p.CreatedAt
            })
            .ToListAsync();

        return Ok(payments);
    }

    // POST /api/payments
    [HttpPost]
    public async Task<IActionResult> CreatePayment(CreatePaymentDto dto) {
        var userId = GetUserId();

        // Verify child ownership if childId provided
        if (dto.ChildId.HasValue) {
            var child = await _db.Children.FindAsync(dto.ChildId.Value);
            if (child == null) return NotFound(new { message = "Child not found." });
            var role = GetUserRole();
            if (role == "Parent" && child.ParentId != userId)
                return Forbid();

            // Block event payments until registration fee is paid
            if (!string.Equals(dto.Type, "Registration", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(child.Status, "Paid", StringComparison.OrdinalIgnoreCase)) {
                return BadRequest(new {
                    code = "registration_unpaid",
                    message = "Registration fee must be paid before making any other payments for this child."
                });
            }

            var paymentGuard = await EnsureCampPaymentAllowedAsync(child.Id, dto.EventId);
            if (paymentGuard != null) {
                return paymentGuard;
            }
        }

        var payment = new Payment {
            UserId = userId,
            ChildId = dto.ChildId,
            EventId = dto.EventId,
            Amount = dto.Amount,
            Type = dto.Type,
            Status = "Pending",
            Reference = Guid.NewGuid().ToString("N")[..12].ToUpper(),
        };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPayments), new { id = payment.Id }, payment);
    }

    // POST /api/payments/checkout/payfast
    // Creates a pending payment and returns a hosted checkout URL.
    [HttpPost("checkout/payfast")]
    [Authorize(Roles = "Parent,Donor")]
    public async Task<IActionResult> CreatePayFastCheckout(CreatePayFastCheckoutDto dto) {
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than 0." });

        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return Unauthorized();

        if (dto.ChildId.HasValue) {
            var child = await _db.Children.FindAsync(dto.ChildId.Value);
            if (child == null) return NotFound(new { message = "Child not found." });
            if (child.ParentId != userId) return Forbid();

            // Block event payments until registration fee is paid
            if (!string.Equals(dto.Type, "Registration", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(child.Status, "Paid", StringComparison.OrdinalIgnoreCase)) {
                return BadRequest(new {
                    code = "registration_unpaid",
                    message = "Registration fee must be paid before making any other payments for this child."
                });
            }

            var paymentGuard = await EnsureCampPaymentAllowedAsync(child.Id, dto.EventId);
            if (paymentGuard != null) {
                return paymentGuard;
            }
        }

        var payment = new Payment {
            UserId = userId,
            ChildId = dto.ChildId,
            EventId = dto.EventId,
            Amount = dto.Amount,
            Type = dto.Type,
            Status = "Pending",
            IsAnonymous = dto.IsAnonymous,
            Notes = dto.Notes,
            Reference = Guid.NewGuid().ToString("N")[..12].ToUpper(),
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        var checkoutUrl = await BuildPayFastCheckoutUrl(payment, user, dto.ItemName);
        if (checkoutUrl == null) {
            return StatusCode(500, new {
                message = "Online payments are not configured. Ask a director to set payment settings."
            });
        }

        return Ok(new CheckoutUrlDto(checkoutUrl, payment.Reference!, payment.Id));
    }

    // POST /api/payments/{id}/checkout/payfast
    // Re-generate checkout URL for an existing pending payment.
    [HttpPost("{id:int}/checkout/payfast")]
    [Authorize(Roles = "Parent,Donor")]
    public async Task<IActionResult> CheckoutExistingPayment(int id) {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return Unauthorized();

        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == id);
        if (payment == null)
            return NotFound(new { message = "Payment not found." });
        if (payment.UserId != userId)
            return Forbid();
        if (!string.Equals(payment.Status, "Pending", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only pending payments can be checked out online." });
        if (payment.ChildId.HasValue) {
            var child = await _db.Children.FindAsync(payment.ChildId.Value);
            if (child != null && !string.Equals(payment.Type, "Registration", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(child.Status, "Paid", StringComparison.OrdinalIgnoreCase)) {
                return BadRequest(new {
                    code = "registration_unpaid",
                    message = "Registration fee must be paid before making any other payments for this child."
                });
            }
            var paymentGuard = await EnsureCampPaymentAllowedAsync(payment.ChildId.Value, payment.EventId);
            if (paymentGuard != null) {
                return paymentGuard;
            }
        }

        var checkoutUrl = await BuildPayFastCheckoutUrl(payment, user, payment.Type + " Payment");
        if (checkoutUrl == null) {
            return StatusCode(500, new {
                message = "Online payments are not configured. Ask a director to set payment settings."
            });
        }

        return Ok(new CheckoutUrlDto(checkoutUrl, payment.Reference!, payment.Id));
    }

    // POST /api/payments/payfast/notify
    // PayFast ITN callback (server-to-server) to finalize payment status.
    [AllowAnonymous]
    [HttpPost("payfast/notify")]
    public async Task<IActionResult> PayFastNotify() {
        if (!Request.HasFormContentType)
            return BadRequest();

        var form = await Request.ReadFormAsync();
        var reference = form["m_payment_id"].ToString();
        var paymentStatus = form["payment_status"].ToString();

        if (string.IsNullOrWhiteSpace(reference))
            return BadRequest();

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var payment = await _db.Payments
            .Include(p => p.Child)
            .FirstOrDefaultAsync(p => p.Reference == reference);
        if (payment == null)
            return NotFound();

        var wasCompleted = string.Equals(payment.Status, "Completed", StringComparison.OrdinalIgnoreCase);
        payment.Status = paymentStatus switch {
            "COMPLETE" => "Completed",
            "FAILED" => "Failed",
            "CANCELLED" => "Failed",
            _ => payment.Status
        };

        var nowCompleted = string.Equals(payment.Status, "Completed", StringComparison.OrdinalIgnoreCase);
        if (!wasCompleted && nowCompleted) {
            // Generate unique receipt code if not already set
            if (string.IsNullOrWhiteSpace(payment.ReceiptCode)) {
                payment.ReceiptCode = GenerateReceiptCode(payment);
            }
            await EnsureChildAdventurerCodeAsync(payment);
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok();
    }

    private static string GenerateReceiptCode(Payment payment) {
        // Format: BAC-RCPT-{year}{month}-{random 6 hex chars}-{paymentId}
        var now = DateTime.UtcNow;
        var random = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"BAC-{now:yyMM}-{random}-{payment.Id}";
    }

    private async Task EnsureChildAdventurerCodeAsync(Payment payment) {
        if (!payment.ChildId.HasValue)
            return;

        if (!string.Equals(payment.Type, "Registration", StringComparison.OrdinalIgnoreCase))
            return;

        var child = payment.Child ?? await _db.Children.FirstOrDefaultAsync(c => c.Id == payment.ChildId.Value);
        if (child == null)
            return;

        if (!string.IsNullOrWhiteSpace(child.AdventurerCode))
            return;

        child.AdventurerCode = await GenerateNextAdventurerCodeAsync(child.Class);
    }

    private async Task<IActionResult?> EnsureCampPaymentAllowedAsync(int childId, int? eventId) {
        if (!eventId.HasValue) {
            return null;
        }

        var ev = await _db.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == eventId.Value);

        if (ev == null || !ev.IsCamp) {
            return null;
        }

        var isBlocked = await _demeritService.IsCampPaymentBlockedAsync(childId);
        if (!isBlocked) {
            return null;
        }

        return BadRequest(new {
            code = "camp_payment_blocked",
            message = "Camp payments are disabled because this child has reached the approved demerit threshold.",
        });
    }

    private async Task<string> GenerateNextAdventurerCodeAsync(string childClass) {
        var prefix = GetClassPrefix(childClass);

        // Global sequence across ALL classes so numbers reflect registration order
        var existingCodes = await _db.Children
            .AsNoTracking()
            .Where(c => c.AdventurerCode != null)
            .Select(c => c.AdventurerCode!)
            .ToListAsync();

        var maxSuffix = 0;
        foreach (var code in existingCodes) {
            var parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 3)
                continue;

            if (int.TryParse(parts[^1], out var suffix) && suffix > maxSuffix)
                maxSuffix = suffix;
        }

        var nextSuffix = maxSuffix + 1;
        return $"ADV-{prefix}-{nextSuffix:D3}";
    }

    private static string GetClassPrefix(string? childClass) {
        var key = NormalizeClassKey(childClass);
        return key switch {
            "littlelamb" => "LITTLE",
            "earlybird" => "EARLY",
            "busybee" => "BUSY",
            "sunbeam" => "SUNBEAM",
            "builder" => "BUILDER",
            "helpinghand" => "HELPING",
            _ => "CLASS"
        };
    }

    private static string NormalizeClassKey(string? value) {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var chars = value.Trim().ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private async Task<string?> BuildPayFastCheckoutUrl(Payment payment, User user, string? itemName) {
        var settings = await GetEffectivePayFastSettingsAsync();
        if (settings == null)
            return null;

        var baseUrl = settings.UseSandbox
            ? "https://sandbox.payfast.co.za/eng/process"
            : "https://www.payfast.co.za/eng/process";

        var fields = new List<KeyValuePair<string, string>> {
            new("merchant_id", settings.MerchantId),
            new("merchant_key", settings.MerchantKey),
            new("return_url", settings.ReturnUrl),
            new("cancel_url", settings.CancelUrl),
            new("notify_url", settings.NotifyUrl),
            new("name_first", user.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "Parent"),
            new("name_last", user.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault() ?? "User"),
            new("email_address", user.Email),
            new("m_payment_id", payment.Reference ?? payment.Id.ToString()),
            new("amount", payment.Amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
            new("item_name", itemName ?? $"{payment.Type} Payment"),
            new("item_description", $"Payment for {payment.Type} ({payment.Reference})")
        };

        var signatureString = string.Join("&", fields
            .Where(f => !string.IsNullOrWhiteSpace(f.Value))
            .Select(f => $"{f.Key}={Uri.EscapeDataString(f.Value).Replace("%20", "+")}"));

        if (!string.IsNullOrWhiteSpace(settings.Passphrase)) {
            signatureString += "&passphrase=" + Uri.EscapeDataString(settings.Passphrase).Replace("%20", "+");
        }

        using var md5 = MD5.Create();
        var signatureBytes = md5.ComputeHash(Encoding.UTF8.GetBytes(signatureString));
        var signature = BitConverter.ToString(signatureBytes).Replace("-", "").ToLowerInvariant();

        var query = signatureString + "&signature=" + signature;
        return baseUrl + "?" + query;
    }

    private async Task<EffectivePayFastSettings?> GetEffectivePayFastSettingsAsync() {
        var dbSettings = await _db.PaymentSettings.FirstOrDefaultAsync();
        var merchantId = dbSettings?.PayFastMerchantId ?? _config["Payments:PayFast:MerchantId"];
        var merchantKey = dbSettings?.PayFastMerchantKey ?? _config["Payments:PayFast:MerchantKey"];

        if (string.IsNullOrWhiteSpace(merchantId) || string.IsNullOrWhiteSpace(merchantKey))
            return null;

        var fallbackSandbox = bool.TryParse(_config["Payments:PayFast:UseSandbox"], out var sandbox) && sandbox;

        return new EffectivePayFastSettings {
            MerchantId = merchantId,
            MerchantKey = merchantKey,
            Passphrase = dbSettings?.PayFastPassphrase ?? _config["Payments:PayFast:Passphrase"],
            UseSandbox = dbSettings?.PayFastUseSandbox ?? fallbackSandbox,
            ReturnUrl = dbSettings?.PayFastReturnUrl ?? _config["Payments:PayFast:ReturnUrl"] ?? "http://localhost:3000/parent/payments?payment=success",
            CancelUrl = dbSettings?.PayFastCancelUrl ?? _config["Payments:PayFast:CancelUrl"] ?? "http://localhost:3000/parent/payments?payment=cancelled",
            NotifyUrl = dbSettings?.PayFastNotifyUrl ?? _config["Payments:PayFast:NotifyUrl"] ?? "http://localhost:5009/api/payments/payfast/notify"
        };
    }
}
