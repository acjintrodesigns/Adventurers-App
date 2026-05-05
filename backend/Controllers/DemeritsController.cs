using System.Security.Claims;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;
using AdventurersApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class DemeritsController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly DemeritService _demeritService;

    public DemeritsController(AppDbContext db, DemeritService demeritService) {
        _db = db;
        _demeritService = demeritService;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserRole() =>
        User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("children/{childId:int}/demerits")]
    public async Task<IActionResult> GetChildDemerits(int childId) {
        var child = await _db.Children
            .Include(item => item.Parent)
            .FirstOrDefaultAsync(item => item.Id == childId);

        if (child == null) {
            return NotFound(new { message = "Child not found." });
        }

        var role = GetUserRole();
        var userId = GetUserId();
        if (role == "Parent" && child.ParentId != userId) {
            return Forbid();
        }

        await _demeritService.RefreshChildAsync(child);

        var records = await _db.DemeritRecords
            .AsNoTracking()
            .Include(record => record.SubmittedByTeacher)
            .Include(record => record.ApprovedByDirector)
            .Where(record => record.ChildId == childId)
            .OrderByDescending(record => record.SubmittedAt)
            .ToListAsync();

        return Ok(records.Select(MapRecord));
    }

    [HttpPost("children/{childId:int}/demerits")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateDemerit(int childId, CreateDemeritDto dto) {
        if (string.IsNullOrWhiteSpace(dto.Reason)) {
            return BadRequest(new { message = "Reason is required." });
        }

        if (string.IsNullOrWhiteSpace(dto.Consequence)) {
            return BadRequest(new { message = "Consequence is required." });
        }

        if (string.IsNullOrWhiteSpace(dto.Remedy)) {
            return BadRequest(new { message = "Remedy is required." });
        }

        var child = await _db.Children.FirstOrDefaultAsync(item => item.Id == childId);
        if (child == null) {
            return NotFound(new { message = "Child not found." });
        }

        var record = new DemeritRecord {
            ChildId = childId,
            SubmittedByTeacherId = GetUserId(),
            Reason = dto.Reason.Trim(),
            Consequence = dto.Consequence.Trim(),
            Remedy = dto.Remedy.Trim(),
            Status = DemeritStatuses.PendingApproval,
            SubmittedAt = DateTime.UtcNow,
        };

        _db.DemeritRecords.Add(record);
        await _db.SaveChangesAsync();
        await _demeritService.RefreshChildAsync(child);

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/approve")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> ApproveDemerit(int id, DemeritApprovalDto dto) {
        var record = await _db.DemeritRecords
            .Include(item => item.Child)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.PendingApproval) {
            return BadRequest(new { message = "Only pending demerits can be approved." });
        }

        var now = DateTime.UtcNow;
        record.Status = DemeritStatuses.ApprovedActive;
        record.ApprovedByDirectorId = GetUserId();
        record.ApprovedAt = now;
        record.EffectiveFrom = now;
        record.ExpiresAt = now.AddDays(28);
        if (!string.IsNullOrWhiteSpace(dto.Consequence)) {
            record.Consequence = dto.Consequence.Trim();
        }
        if (!string.IsNullOrWhiteSpace(dto.Remedy)) {
            record.Remedy = dto.Remedy.Trim();
        }

        await _db.SaveChangesAsync();
        await _demeritService.RefreshChildAsync(record.Child!);

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/reject")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> RejectDemerit(int id, DemeritDecisionDto dto) {
        var record = await _db.DemeritRecords.FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.PendingApproval) {
            return BadRequest(new { message = "Only pending demerits can be rejected." });
        }

        record.Status = DemeritStatuses.Rejected;
        record.ApprovedByDirectorId = GetUserId();
        record.RejectedAt = DateTime.UtcNow;
        record.RejectionReason = dto.Note?.Trim();
        await _db.SaveChangesAsync();

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/request-stop")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> RequestStop(int id, DemeritActionRequestDto dto) {
        var record = await _db.DemeritRecords.FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.ApprovedActive) {
            return BadRequest(new { message = "Only active approved demerits can have a stop request." });
        }

        record.Status = DemeritStatuses.StopRequested;
        record.StopRequestedById = GetUserId();
        record.StopRequestedAt = DateTime.UtcNow;
        record.StopReason = dto.Reason?.Trim();
        await _db.SaveChangesAsync();

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/approve-stop")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> ApproveStop(int id, DemeritDecisionDto dto) {
        var record = await _db.DemeritRecords
            .Include(item => item.Child)
            .FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.StopRequested) {
            return BadRequest(new { message = "Only stop-requested demerits can be stopped." });
        }

        record.Status = DemeritStatuses.Stopped;
        record.StoppedByDirectorId = GetUserId();
        record.StoppedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Note)) {
            record.StopReason = dto.Note.Trim();
        }

        await _db.SaveChangesAsync();
        await _demeritService.RefreshChildAsync(record.Child!);

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/stop")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> StopDirectly(int id, DemeritDecisionDto dto) {
        var record = await _db.DemeritRecords
            .Include(item => item.Child)
            .FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.ApprovedActive) {
            return BadRequest(new { message = "Only active approved demerits can be stopped directly." });
        }

        record.Status = DemeritStatuses.Stopped;
        record.StoppedByDirectorId = GetUserId();
        record.StoppedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Note)) {
            record.StopReason = dto.Note.Trim();
        }

        await _db.SaveChangesAsync();
        await _demeritService.RefreshChildAsync(record.Child!);

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/request-delete")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> RequestDelete(int id, DemeritActionRequestDto dto) {
        var record = await _db.DemeritRecords.FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.ApprovedActive) {
            return BadRequest(new { message = "Only active approved demerits can have a delete request." });
        }

        record.Status = DemeritStatuses.DeleteRequested;
        record.DeleteRequestedById = GetUserId();
        record.DeleteRequestedAt = DateTime.UtcNow;
        record.DeleteReason = dto.Reason?.Trim();
        await _db.SaveChangesAsync();

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/approve-delete")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> ApproveDelete(int id, DemeritDecisionDto dto) {
        var record = await _db.DemeritRecords
            .Include(item => item.Child)
            .FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.DeleteRequested) {
            return BadRequest(new { message = "Only delete-requested demerits can be deleted." });
        }

        record.Status = DemeritStatuses.Deleted;
        record.DeletedByDirectorId = GetUserId();
        record.DeletedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Note)) {
            record.DeleteReason = dto.Note.Trim();
        }

        await _db.SaveChangesAsync();
        await _demeritService.RefreshChildAsync(record.Child!);

        return Ok(MapRecord(record));
    }

    [HttpPost("demerits/{id:int}/delete")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> DeleteDirectly(int id, DemeritDecisionDto dto) {
        var record = await _db.DemeritRecords
            .Include(item => item.Child)
            .FirstOrDefaultAsync(item => item.Id == id);
        if (record == null) {
            return NotFound(new { message = "Demerit not found." });
        }

        if (record.Status != DemeritStatuses.ApprovedActive) {
            return BadRequest(new { message = "Only active approved demerits can be deleted directly." });
        }

        record.Status = DemeritStatuses.Deleted;
        record.DeletedByDirectorId = GetUserId();
        record.DeletedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Note)) {
            record.DeleteReason = dto.Note.Trim();
        }

        await _db.SaveChangesAsync();
        await _demeritService.RefreshChildAsync(record.Child!);

        return Ok(MapRecord(record));
    }

    private static object MapRecord(DemeritRecord record) => new {
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