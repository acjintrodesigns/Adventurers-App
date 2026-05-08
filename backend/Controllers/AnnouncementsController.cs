using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController : ControllerBase {
    private readonly AppDbContext _db;

    public AnnouncementsController(AppDbContext db) {
        _db = db;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/announcements
    [HttpGet]
    public async Task<IActionResult> GetAnnouncements([FromQuery] string? targetClass = null) {
        var query = _db.Announcements.Include(a => a.Author).AsQueryable();

        if (!string.IsNullOrEmpty(targetClass))
            query = query.Where(a => a.TargetClass == null || a.TargetClass == targetClass);

        var announcements = await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new {
                a.Id, a.Title, a.Body,
                a.AuthorId, AuthorName = a.Author!.Name, AuthorRole = a.Author!.Role,
                a.TargetClass, a.CreatedAt
            })
            .ToListAsync();

        return Ok(announcements);
    }

    // POST /api/announcements
    [HttpPost]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> CreateAnnouncement(CreateAnnouncementDto dto) {
        var announcement = new Announcement {
            Title = dto.Title,
            Body = dto.Body,
            AuthorId = GetUserId(),
            TargetClass = dto.TargetClass,
        };
        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAnnouncements), new { id = announcement.Id }, new {
            announcement.Id, announcement.Title, announcement.Body,
            announcement.AuthorId, announcement.TargetClass, announcement.CreatedAt
        });
    }

    // DELETE /api/announcements/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Director,Teacher")]
    public async Task<IActionResult> DeleteAnnouncement(int id) {
        var announcement = await _db.Announcements.FindAsync(id);
        if (announcement == null) return NotFound();

        var userId = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var isDirector = string.Equals(role, "Director", StringComparison.OrdinalIgnoreCase);

        // Teachers can only delete their own announcements; directors can delete any.
        if (!isDirector && announcement.AuthorId != userId)
            return Forbid();

        _db.Announcements.Remove(announcement);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/announcements
    [HttpDelete]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> ClearAnnouncements() {
        var existing = await _db.Announcements.ToListAsync();
        if (existing.Count == 0)
            return Ok(new { deleted = 0 });

        _db.Announcements.RemoveRange(existing);
        await _db.SaveChangesAsync();
        return Ok(new { deleted = existing.Count });
    }
}
