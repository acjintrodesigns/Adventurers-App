using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;
using AdventurersApi.Services;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/children")]
[Authorize]
public class ChildrenController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly DemeritService _demeritService;

    public ChildrenController(AppDbContext db, DemeritService demeritService) {
        _db = db;
        _demeritService = demeritService;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserRole() =>
        User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<string?> GetAssignedClassAsync(int teacherUserId) =>
        await _db.TeacherRegistrations
            .AsNoTracking()
            .Where(reg => reg.UserId == teacherUserId)
            .Select(reg => reg.AssignedClass)
            .FirstOrDefaultAsync();

    /// <summary>
    /// Derives gender from a South African ID number (digit at index 6: 0–4 = Female, 5–9 = Male).
    /// Returns null if the ID is not a valid 13-digit SA ID or the document type is Passport.
    /// </summary>
    private static string? DeriveGenderFromId(string? documentType, string? documentNumber) {
        if (!string.Equals(documentType, "ID", StringComparison.OrdinalIgnoreCase)) return null;
        var digits = documentNumber?.Trim() ?? "";
        if (digits.Length != 13 || !digits.All(char.IsDigit)) return null;
        return int.Parse(digits[6].ToString()) >= 5 ? "Male" : "Female";
    }

    private static string? ResolveGender(Child c) =>
        string.IsNullOrWhiteSpace(c.Gender) ? DeriveGenderFromId(c.DocumentType, c.DocumentNumber) : c.Gender;

    private static List<string> BuildComplianceIssues(Child c) {
        var issues = new List<string>();

        if (!c.IndemnitySigned)
            issues.Add("Indemnity form has not been signed.");

        if (string.IsNullOrWhiteSpace(c.MedicalAidInfo) ||
            c.MedicalAidInfo.Trim().Equals("None", StringComparison.OrdinalIgnoreCase))
            issues.Add("Medical aid information is missing or incomplete.");

        if (string.IsNullOrWhiteSpace(c.DocumentNumber))
            issues.Add("Identity document number is missing.");

        if (c.DemeritCount >= 5 || c.IsDelistedFromCamps)
            issues.Add("Child is delisted from camps due to demerit threshold.");

        return issues;
    }

    // GET /api/children
    // Directors see all children, parents see their own, teachers only their assigned class.
    [HttpGet]
    public async Task<IActionResult> GetChildren() {
        var role = GetUserRole();
        var userId = GetUserId();

        var query = _db.Children.Include(c => c.Parent).AsQueryable();

        if (role == "Parent")
            query = query.Where(c => c.ParentId == userId);
        else if (role == "Teacher") {
            var assignedClass = await GetAssignedClassAsync(userId);
            if (string.IsNullOrWhiteSpace(assignedClass))
                return Ok(Array.Empty<object>());
            query = query.Where(c => c.Class == assignedClass);
        }

        var children = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var demeritSummaries = await _demeritService.RefreshChildrenAsync(children);
        var childIds = children.Select(c => c.Id).ToList();
        var activeDemerits = await _db.DemeritRecords
            .AsNoTracking()
            .Include(record => record.ApprovedByDirector)
            .Where(record => childIds.Contains(record.ChildId)
                && (record.Status == DemeritStatuses.ApprovedActive
                    || record.Status == DemeritStatuses.StopRequested
                    || record.Status == DemeritStatuses.DeleteRequested))
            .OrderByDescending(record => record.ApprovedAt ?? record.SubmittedAt)
            .ToListAsync();

        var activeDemeritsByChildId = activeDemerits
            .GroupBy(record => record.ChildId)
            .ToDictionary(group => group.Key, group => group.Select(MapDemeritRecord).ToList());

        var childrenWithCompliance = children.Select(c => new {
            c.Id, c.Name, c.DateOfBirth, Gender = ResolveGender(c), c.PhotoUrl,
            c.DocumentType, c.DocumentNumber,
            c.MedicalAidInfo, c.Class, c.Status, c.AdventurerCode,
            c.IndemnitySigned, c.IndemnitySignedAt, c.IndemnitySignedByName,
            c.IndemnitySignerRelationship, c.DemeritCount, c.IsDelistedFromCamps,
            c.ParentId, ParentName = c.Parent!.Name, c.CreatedAt,
            PendingDemeritCount = demeritSummaries[c.Id].PendingApprovalCount,
            ActiveDemerits = activeDemeritsByChildId.GetValueOrDefault(c.Id, []),
            ComplianceIssues = BuildComplianceIssues(c),
        });

        return Ok(childrenWithCompliance);
    }

    // POST /api/children
    [HttpPost]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> CreateChild(CreateChildDto dto) {
        var normalizedType = dto.DocumentType?.Trim().ToUpperInvariant();
        if (normalizedType is not ("ID" or "PASSPORT"))
            return BadRequest(new { message = "Document type must be ID or Passport." });

        if (string.IsNullOrWhiteSpace(dto.DocumentNumber))
            return BadRequest(new { message = "Document number is required." });

        var resolvedDocType = normalizedType == "PASSPORT" ? "Passport" : "ID";
        var resolvedDocNumber = dto.DocumentNumber.Trim();
        var child = new Child {
            Name = dto.Name,
            DateOfBirth = dto.DateOfBirth,
            Gender = DeriveGenderFromId(resolvedDocType, resolvedDocNumber) ?? dto.Gender?.Trim(),
            DocumentType = resolvedDocType,
            DocumentNumber = resolvedDocNumber,
            Class = dto.Class,
            MedicalAidInfo = dto.MedicalAidInfo,
            PhotoUrl = dto.PhotoUrl,
            ParentId = GetUserId(),
        };
        _db.Children.Add(child);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetChild), new { id = child.Id }, child);
    }

    // GET /api/children/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetChild(int id) {
        var role = GetUserRole();
        var userId = GetUserId();

        var child = await _db.Children
            .Include(c => c.Parent)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (child == null) return NotFound();

        if (role == "Parent" && child.ParentId != userId)
            return Forbid();
        if (role == "Teacher") {
            var assignedClass = await GetAssignedClassAsync(userId);
            if (string.IsNullOrWhiteSpace(assignedClass) || child.Class != assignedClass)
                return Forbid();
        }

        var summary = await _demeritService.RefreshChildAsync(child);
        var demeritHistory = await _db.DemeritRecords
            .AsNoTracking()
            .Include(record => record.SubmittedByTeacher)
            .Include(record => record.ApprovedByDirector)
            .Where(record => record.ChildId == child.Id)
            .OrderByDescending(record => record.SubmittedAt)
            .ToListAsync();

        return Ok(new {
            child.Id, child.Name, child.DateOfBirth, Gender = ResolveGender(child), child.PhotoUrl,
            child.DocumentType, child.DocumentNumber,
            child.MedicalAidInfo, child.Class, child.Status, child.AdventurerCode,
            child.IndemnitySigned, child.IndemnitySignedAt, child.IndemnitySignedByName,
            child.IndemnitySignerRelationship, child.IndemnitySignatureDataUrl,
            child.DemeritCount, child.IsDelistedFromCamps,
            child.ParentId, ParentName = child.Parent?.Name, child.CreatedAt,
            ParentPhone = child.Parent?.Phone,
            ParentAddress = child.Parent?.Address,
            ParentRelationship = child.Parent?.Relationship,
            ParentEmail = child.Parent?.Email,
            ParentEmergencyContactName = child.Parent?.EmergencyContactName,
            ParentEmergencyContactPhone = child.Parent?.EmergencyContactPhone,
            ParentSecondaryGuardianJson = child.Parent?.SecondaryGuardianJson,
            PendingDemeritCount = summary.PendingApprovalCount,
            DemeritHistory = demeritHistory.Select(MapDemeritRecord).ToList(),
            ComplianceIssues = BuildComplianceIssues(child),
        });
    }

    // PUT /api/children/{id}/indemnity
    [HttpPut("{id}/indemnity")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> UpdateIndemnity(int id, UpdateChildIndemnityDto dto) {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "Full name is required." });

        if (string.IsNullOrWhiteSpace(dto.Relationship))
            return BadRequest(new { message = "Relationship is required." });

        if (string.IsNullOrWhiteSpace(dto.SignatureDataUrl))
            return BadRequest(new { message = "Signature is required." });

        var child = await _db.Children.FindAsync(id);
        if (child == null) return NotFound();

        var userId = GetUserId();
        if (child.ParentId != userId)
            return Forbid();

        child.IndemnitySigned = true;
        child.IndemnitySignedAt = DateTime.UtcNow;
        child.IndemnitySignedByName = dto.FullName.Trim();
        child.IndemnitySignerRelationship = dto.Relationship.Trim();
        child.IndemnitySignatureDataUrl = dto.SignatureDataUrl;

        await _db.SaveChangesAsync();
        return Ok(new {
            child.Id,
            child.IndemnitySigned,
            child.IndemnitySignedAt,
            child.IndemnitySignedByName,
            child.IndemnitySignerRelationship,
            child.IndemnitySignatureDataUrl,
        });
    }

    // PUT /api/children/{id}/indemnity/save — saves signature drawing without formally signing
    [HttpPut("{id}/indemnity/save")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> SaveIndemnitySignature(int id, SaveIndemnitySignatureDto dto) {
        if (string.IsNullOrWhiteSpace(dto.SignatureDataUrl))
            return BadRequest(new { message = "Signature is required." });

        var child = await _db.Children.FindAsync(id);
        if (child == null) return NotFound();

        var userId = GetUserId();
        if (child.ParentId != userId)
            return Forbid();

        // Save signature and optional name/relationship without marking as signed
        child.IndemnitySignatureDataUrl = dto.SignatureDataUrl;
        if (!string.IsNullOrWhiteSpace(dto.FullName))
            child.IndemnitySignedByName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Relationship))
            child.IndemnitySignerRelationship = dto.Relationship.Trim();

        await _db.SaveChangesAsync();
        return Ok(new { saved = true });
    }

    // PUT /api/children/{id}/status
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateChildStatusDto dto) {
        var allowedStatuses = new[] { "Pending", "Approved", "Rejected" };
        if (!allowedStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Invalid status." });

        var child = await _db.Children.FindAsync(id);
        if (child == null) return NotFound();

        if (GetUserRole() == "Teacher") {
            var assignedClass = await GetAssignedClassAsync(GetUserId());
            if (string.IsNullOrWhiteSpace(assignedClass) || child.Class != assignedClass)
                return Forbid();
        }

        child.Status = dto.Status;
        await _db.SaveChangesAsync();
        return Ok(new { child.Id, child.Status });
    }

    // PUT /api/children/{id}/finalize-payment
    [HttpPut("{id}/finalize-payment")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> FinalizePayment(int id) {
        var userId = GetUserId();
        var child = await _db.Children.FindAsync(id);

        if (child == null)
            return NotFound(new { message = "Child not found." });

        if (child.ParentId != userId)
            return Forbid();

        if (child.Status != "Approved")
            return BadRequest(new { message = "Child registration must be approved before payment." });

        if (!string.IsNullOrEmpty(child.AdventurerCode))
            return BadRequest(new { message = "Adventurer code already generated for this child." });

        // Generate adventurer code: ADV-[CLASS_CODE]-[SEQUENCE_NUMBER]
        var classCode = GetClassCode(child.Class);
        var sequenceNumber = await GenerateSequenceNumber(classCode);
        child.AdventurerCode = $"ADV-{classCode}-{sequenceNumber:D3}";
        child.Status = "Paid";

        // Create a completed Payment record so it appears on the parent's payments page
        var studentFee = await _db.PaymentSettings
            .AsNoTracking()
            .Select(s => (decimal?)s.StudentRegistrationFeePrice)
            .FirstOrDefaultAsync() ?? 450m;

        var receiptCode = $"BAC-{Guid.NewGuid().ToString("N").ToUpper()[..12]}";
        var payment = new Payment {
            UserId = userId,
            ChildId = child.Id,
            Amount = studentFee,
            Type = "Registration",
            Status = "Completed",
            Reference = $"REG-{child.Id}-{DateTime.UtcNow:yyyyMMdd}",
            ReceiptCode = receiptCode,
            Notes = $"Registration fee for {child.Name}",
            CreatedAt = DateTime.UtcNow,
        };
        _db.Payments.Add(payment);

        await _db.SaveChangesAsync();
        return Ok(new { child.Id, child.AdventurerCode, child.Status, ReceiptCode = receiptCode });
    }

    private static string GetClassCode(string className) => className switch {
        "Busy Bee" => "BUS",
        "Builder" => "BUI",
        "Helping Hand" => "HEL",
        "Sunbeam" => "SUN",
        "Early Bird" => "EAR",
        "Little Lamb" => "LAM",
        _ => "ADV"
    };

    private async Task<int> GenerateSequenceNumber(string classCode) {
        // Global sequence across ALL classes so numbers reflect registration order
        var maxCode = await _db.Children
            .Where(c => !string.IsNullOrEmpty(c.AdventurerCode))
            .OrderByDescending(c => c.AdventurerCode)
            .FirstOrDefaultAsync();

        if (maxCode == null)
            return 1;

        // Extract the sequence number from the last code (e.g., "ADV-SUN-005" -> 5)
        var lastCode = maxCode.AdventurerCode!;
        if (int.TryParse(lastCode.Substring(lastCode.LastIndexOf('-') + 1), out var num))
            return num + 1;

        return 1;
    }

    private static object MapDemeritRecord(DemeritRecord record) => new {
        record.Id,
        record.ChildId,
        record.Status,
        record.Reason,
        record.Consequence,
        record.Remedy,
        record.SubmittedAt,
        record.ApprovedAt,
        record.EffectiveFrom,
        record.ExpiresAt,
        record.RejectedAt,
        record.RejectionReason,
        record.StopRequestedAt,
        record.StopReason,
        record.StoppedAt,
        record.DeleteRequestedAt,
        record.DeleteReason,
        record.DeletedAt,
        record.ExpiredAt,
        SubmittedByTeacherName = record.SubmittedByTeacher?.Name,
        ApprovedByDirectorName = record.ApprovedByDirector?.Name,
    };
}
