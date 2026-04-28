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

    // GET /api/progress/{childId}
    [HttpGet("{childId}")]
    public async Task<IActionResult> GetProgress(int childId) {
        var role = GetUserRole();
        var userId = GetUserId();

        // Parents can only view their own child's progress
        if (role == "Parent") {
            var child = await _db.Children.FindAsync(childId);
            if (child == null) return NotFound();
            if (child.ParentId != userId) return Forbid();
        }

        var items = await _db.ProgressItems
            .Where(p => p.ChildId == childId)
            .OrderBy(p => p.Category)
            .ThenBy(p => p.RequirementName)
            .ToListAsync();

        return Ok(items);
    }

    // POST /api/progress/complete
    [HttpPost("complete")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> MarkComplete([FromBody] CompleteProgressDto dto) {
        var existing = await _db.ProgressItems
            .FirstOrDefaultAsync(p => p.ChildId == dto.ChildId && p.RequirementName == dto.RequirementName);

        if (existing != null) {
            existing.IsCompleted = true;
            existing.ProofImageUrl = dto.ProofImageUrl;
            existing.TeacherId = GetUserId();
            existing.CompletedAt = DateTime.UtcNow;
        } else {
            var item = new ProgressItem {
                ChildId = dto.ChildId,
                Category = dto.Category,
                RequirementName = dto.RequirementName,
                IsCompleted = true,
                ProofImageUrl = dto.ProofImageUrl,
                TeacherId = GetUserId(),
                CompletedAt = DateTime.UtcNow,
            };
            _db.ProgressItems.Add(item);
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Progress updated." });
    }
}

// DTO local to this controller for marking complete
public record CompleteProgressDto(int ChildId, string Category, string RequirementName, string? ProofImageUrl);
