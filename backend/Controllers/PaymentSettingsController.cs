using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/payment-settings")]
[Authorize]
public class PaymentSettingsController : ControllerBase {
    private readonly AppDbContext _db;

    public PaymentSettingsController(AppDbContext db) {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPublicSettings() {
        var settings = await GetOrCreateSettings();
        var onlineEnabled = !string.IsNullOrWhiteSpace(settings.PayFastMerchantId)
            && !string.IsNullOrWhiteSpace(settings.PayFastMerchantKey);

        return Ok(new PublicPaymentSettingsDto(
            settings.StudentRegistrationFeePrice,
            settings.TeachersRegistrationFeePrice,
            settings.WorkCommencmentDate,
            settings.WorkCompletionDate,
            settings.CompletionConfirmationDate,
            settings.InvestigerDate,
            settings.BankName,
            settings.AccountName,
            settings.AccountNumber,
            settings.BranchCode,
            onlineEnabled
        ));
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> GetAdminSettings() {
        var settings = await GetOrCreateSettings();

        return Ok(new AdminPaymentSettingsDto(
            settings.StudentRegistrationFeePrice,
            settings.TeachersRegistrationFeePrice,
            settings.WorkCommencmentDate,
            settings.WorkCompletionDate,
            settings.CompletionConfirmationDate,
            settings.InvestigerDate,
            settings.BankName,
            settings.AccountName,
            settings.AccountNumber,
            settings.BranchCode,
            settings.PayFastMerchantId,
            settings.PayFastMerchantKey,
            settings.PayFastPassphrase,
            settings.PayFastUseSandbox,
            settings.PayFastReturnUrl,
            settings.PayFastCancelUrl,
            settings.PayFastNotifyUrl
        ));
    }

    [HttpPut]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> UpdateSettings(UpdatePaymentSettingsDto dto) {
        var settings = await GetOrCreateSettings();

        if (dto.StudentRegistrationFeePrice.HasValue && dto.StudentRegistrationFeePrice.Value < 0)
            return BadRequest(new { message = "Student registration fee cannot be negative." });

        if (dto.TeachersRegistrationFeePrice.HasValue && dto.TeachersRegistrationFeePrice.Value < 0)
            return BadRequest(new { message = "Teachers registration fee cannot be negative." });

        var workCommencmentDate = dto.WorkCommencmentDate ?? settings.WorkCommencmentDate;
        var workCompletionDate = dto.WorkCompletionDate ?? settings.WorkCompletionDate;
        var completionConfirmationDate = dto.CompletionConfirmationDate ?? settings.CompletionConfirmationDate;
        var investigerDate = dto.InvestigerDate ?? settings.InvestigerDate;

        if (workCommencmentDate.HasValue && workCompletionDate.HasValue && workCompletionDate.Value < workCommencmentDate.Value)
            return BadRequest(new { message = "Work completion date cannot be before work commencment date." });

        if (workCompletionDate.HasValue && completionConfirmationDate.HasValue && completionConfirmationDate.Value < workCompletionDate.Value)
            return BadRequest(new { message = "Completion confirmation date cannot be before work completion date." });

        if (completionConfirmationDate.HasValue && investigerDate.HasValue && investigerDate.Value < completionConfirmationDate.Value)
            return BadRequest(new { message = "Investiger date cannot be before completion confirmation date." });

        if (dto.StudentRegistrationFeePrice.HasValue)
            settings.StudentRegistrationFeePrice = dto.StudentRegistrationFeePrice.Value;

        if (dto.TeachersRegistrationFeePrice.HasValue)
            settings.TeachersRegistrationFeePrice = dto.TeachersRegistrationFeePrice.Value;

        settings.WorkCommencmentDate = workCommencmentDate;
        settings.WorkCompletionDate = workCompletionDate;
        settings.CompletionConfirmationDate = completionConfirmationDate;
        settings.InvestigerDate = investigerDate;

        settings.BankName = dto.BankName?.Trim() ?? settings.BankName;
        settings.AccountName = dto.AccountName?.Trim() ?? settings.AccountName;
        settings.AccountNumber = dto.AccountNumber?.Trim() ?? settings.AccountNumber;
        settings.BranchCode = dto.BranchCode?.Trim() ?? settings.BranchCode;

        settings.PayFastMerchantId = string.IsNullOrWhiteSpace(dto.PayFastMerchantId) ? null : dto.PayFastMerchantId.Trim();
        settings.PayFastMerchantKey = string.IsNullOrWhiteSpace(dto.PayFastMerchantKey) ? null : dto.PayFastMerchantKey.Trim();
        settings.PayFastPassphrase = string.IsNullOrWhiteSpace(dto.PayFastPassphrase) ? null : dto.PayFastPassphrase.Trim();
        settings.PayFastUseSandbox = dto.PayFastUseSandbox;
        settings.PayFastReturnUrl = string.IsNullOrWhiteSpace(dto.PayFastReturnUrl) ? null : dto.PayFastReturnUrl.Trim();
        settings.PayFastCancelUrl = string.IsNullOrWhiteSpace(dto.PayFastCancelUrl) ? null : dto.PayFastCancelUrl.Trim();
        settings.PayFastNotifyUrl = string.IsNullOrWhiteSpace(dto.PayFastNotifyUrl) ? null : dto.PayFastNotifyUrl.Trim();
        settings.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Payment settings saved." });
    }

    private async Task<PaymentSettings> GetOrCreateSettings() {
        var settings = await _db.PaymentSettings.FirstOrDefaultAsync();
        if (settings != null) return settings;

        settings = new PaymentSettings();
        _db.PaymentSettings.Add(settings);
        await _db.SaveChangesAsync();
        return settings;
    }
}
