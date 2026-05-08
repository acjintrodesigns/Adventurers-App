using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/progress")]
[Authorize]
public class ProgressController : ControllerBase {
    private readonly AppDbContext _db;

    public ProgressController(AppDbContext db) {
        _db = db;
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

    private async Task<(Child? child, IActionResult? error)> GetAuthorizedChildAsync(int childId) {
        var role = GetUserRole();
        var userId = GetUserId();

        var child = await _db.Children.AsNoTracking().FirstOrDefaultAsync(c => c.Id == childId);
        if (child == null)
            return (null, NotFound(new { message = "Child not found." }));

        if (role == "Parent" && child.ParentId != userId)
            return (null, Forbid());

        if (role == "Teacher") {
            var assignedClass = await GetAssignedClassAsync(userId);
            if (string.IsNullOrWhiteSpace(assignedClass) || !string.Equals(child.Class, assignedClass, StringComparison.OrdinalIgnoreCase))
                return (null, Forbid());
        }

        return (child, null);
    }

    private async Task<IActionResult> UpsertBookWorkAsync(CompleteBookWorkDto dto) {
        if (string.IsNullOrWhiteSpace(dto.Category) || string.IsNullOrWhiteSpace(dto.RequirementName))
            return BadRequest(new { message = "Category and requirement name are required." });
        if (string.IsNullOrWhiteSpace(dto.ProofImageUrl))
            return BadRequest(new { message = "Proof image is required to complete this item." });

        var (_, authError) = await GetAuthorizedChildAsync(dto.ChildId);
        if (authError != null)
            return authError;

        var userId = GetUserId();
        var existing = await _db.BookWorkProgressItems
            .FirstOrDefaultAsync(p =>
                p.ChildId == dto.ChildId &&
                p.Category == dto.Category &&
                p.RequirementName == dto.RequirementName);

        if (existing != null) {
            existing.IsCompleted = true;
            existing.ProofImageUrl = dto.ProofImageUrl;
            existing.TeacherId = userId;
            existing.CompletedAt = DateTime.UtcNow;
        } else {
            _db.BookWorkProgressItems.Add(new BookWorkProgressItem {
                ChildId = dto.ChildId,
                Category = dto.Category,
                RequirementName = dto.RequirementName,
                IsCompleted = true,
                ProofImageUrl = dto.ProofImageUrl,
                TeacherId = userId,
                CompletedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Book work updated." });
    }

    // Legacy compatibility: GET /api/progress/{childId} returns Book Work items.
    [HttpGet("{childId}")]
    public async Task<IActionResult> GetProgress(int childId) {
        var (_, authError) = await GetAuthorizedChildAsync(childId);
        if (authError != null)
            return authError;

        var items = await _db.BookWorkProgressItems
            .Where(p => p.ChildId == childId)
            .OrderBy(p => p.Category)
            .ThenBy(p => p.RequirementName)
            .ToListAsync();

        return Ok(items);
    }

    // Legacy compatibility: POST /api/progress/complete writes to Book Work.
    [HttpPost("complete")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> MarkComplete([FromBody] CompleteProgressDto dto) {
        return await UpsertBookWorkAsync(new CompleteBookWorkDto(
            dto.ChildId,
            dto.Category,
            dto.RequirementName,
            dto.ProofImageUrl
        ));
    }

    // GET /api/progress/book-work/{childId}
    [HttpGet("book-work/{childId}")]
    public async Task<IActionResult> GetBookWorkProgress(int childId) {
        var (_, authError) = await GetAuthorizedChildAsync(childId);
        if (authError != null)
            return authError;

        var items = await _db.BookWorkProgressItems
            .Where(p => p.ChildId == childId)
            .OrderBy(p => p.Category)
            .ThenBy(p => p.RequirementName)
            .ToListAsync();

        return Ok(items);
    }

    // POST /api/progress/book-work/complete
    [HttpPost("book-work/complete")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> MarkBookWorkComplete([FromBody] CompleteBookWorkDto dto) {
        return await UpsertBookWorkAsync(dto);
    }

    // GET /api/progress/honors/{childId}
    [HttpGet("honors/{childId}")]
    public async Task<IActionResult> GetHonorsProgress(int childId) {
        var (_, authError) = await GetAuthorizedChildAsync(childId);
        if (authError != null)
            return authError;

        var items = await _db.HonorProgressItems
            .Where(p => p.ChildId == childId)
            .OrderBy(p => p.Category)
            .ThenBy(p => p.HonorName)
            .ToListAsync();

        return Ok(items);
    }

    // POST /api/progress/honors/complete
    [HttpPost("honors/complete")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> MarkHonorComplete([FromBody] CompleteHonorDto dto) {
        if (string.IsNullOrWhiteSpace(dto.Category) || string.IsNullOrWhiteSpace(dto.HonorName))
            return BadRequest(new { message = "Category and honor name are required." });
        if (string.IsNullOrWhiteSpace(dto.ProofImageUrl))
            return BadRequest(new { message = "Proof image is required to complete this honor." });

        var (_, authError) = await GetAuthorizedChildAsync(dto.ChildId);
        if (authError != null)
            return authError;

        var userId = GetUserId();
        var existing = await _db.HonorProgressItems
            .FirstOrDefaultAsync(p =>
                p.ChildId == dto.ChildId &&
                p.Category == dto.Category &&
                p.HonorName == dto.HonorName);

        if (existing != null) {
            existing.IsCompleted = true;
            existing.ProofImageUrl = dto.ProofImageUrl;
            existing.TeacherId = userId;
            existing.CompletedAt = DateTime.UtcNow;
        } else {
            _db.HonorProgressItems.Add(new HonorProgressItem {
                ChildId = dto.ChildId,
                Category = dto.Category,
                HonorName = dto.HonorName,
                IsCompleted = true,
                ProofImageUrl = dto.ProofImageUrl,
                TeacherId = userId,
                CompletedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Honor updated." });
    }

    // GET /api/progress/locked-topics/{childId}
    [HttpGet("locked-topics/{childId}")]
    public async Task<IActionResult> GetLockedTopics(int childId) {
        var (_, authError) = await GetAuthorizedChildAsync(childId);
        if (authError != null)
            return authError;

        var items = await _db.LockedTopics
            .Where(t => t.ChildId == childId)
            .Select(t => new { t.Section, t.Topic })
            .ToListAsync();

        return Ok(items);
    }

    // POST /api/progress/locked-topics
    [HttpPost("locked-topics")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> LockTopic([FromBody] LockTopicDto dto) {
        if (string.IsNullOrWhiteSpace(dto.Section) || string.IsNullOrWhiteSpace(dto.Topic))
            return BadRequest(new { message = "Section and topic are required." });

        var (_, authError) = await GetAuthorizedChildAsync(dto.ChildId);
        if (authError != null)
            return authError;

        var userId = GetUserId();
        var existing = await _db.LockedTopics
            .FirstOrDefaultAsync(t => t.ChildId == dto.ChildId && t.Section == dto.Section);

        if (existing != null) {
            existing.Topic = dto.Topic;
            existing.LockedByTeacherId = userId;
            existing.LockedAt = DateTime.UtcNow;
        } else {
            _db.LockedTopics.Add(new LockedTopic {
                ChildId = dto.ChildId,
                Section = dto.Section,
                Topic = dto.Topic,
                LockedByTeacherId = userId,
                LockedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Topic locked." });
    }

    // DELETE /api/progress/locked-topics/{childId}/{section}
    [HttpDelete("locked-topics/{childId}/{section}")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> UnlockTopic(int childId, string section) {
        var (_, authError) = await GetAuthorizedChildAsync(childId);
        if (authError != null)
            return authError;

        var existing = await _db.LockedTopics
            .FirstOrDefaultAsync(t => t.ChildId == childId && t.Section == section);

        if (existing != null) {
            _db.LockedTopics.Remove(existing);
            await _db.SaveChangesAsync();
        }

        return Ok(new { message = "Topic unlocked." });
    }
}

// DTO local to this controller for marking complete
public record CompleteProgressDto(int ChildId, string Category, string RequirementName, string? ProofImageUrl);
public record CompleteBookWorkDto(int ChildId, string Category, string RequirementName, string? ProofImageUrl);
public record CompleteHonorDto(int ChildId, string Category, string HonorName, string? ProofImageUrl);
public record LockTopicDto(int ChildId, string Section, string Topic);
