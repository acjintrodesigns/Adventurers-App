using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/children")]
[Authorize]
public class ChildrenController : ControllerBase {
    private readonly AppDbContext _db;

    public ChildrenController(AppDbContext db) {
        _db = db;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserRole() =>
        User.FindFirstValue(ClaimTypes.Role)!;

    // GET /api/children
    // Directors/Teachers see all children; Parents see only their own.
    [HttpGet]
    public async Task<IActionResult> GetChildren() {
        var role = GetUserRole();
        var userId = GetUserId();

        var query = _db.Children.Include(c => c.Parent).AsQueryable();

        if (role == "Parent")
            query = query.Where(c => c.ParentId == userId);

        var children = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new {
                c.Id, c.Name, c.DateOfBirth, c.PhotoUrl,
                c.MedicalAidInfo, c.Class, c.Status,
                c.ParentId, ParentName = c.Parent!.Name, c.CreatedAt
            })
            .ToListAsync();

        return Ok(children);
    }

    // POST /api/children
    [HttpPost]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> CreateChild(CreateChildDto dto) {
        var child = new Child {
            Name = dto.Name,
            DateOfBirth = dto.DateOfBirth,
            Class = dto.Class,
            MedicalAidInfo = dto.MedicalAidInfo,
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

        return Ok(new {
            child.Id, child.Name, child.DateOfBirth, child.PhotoUrl,
            child.MedicalAidInfo, child.Class, child.Status,
            child.ParentId, ParentName = child.Parent?.Name, child.CreatedAt
        });
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

        child.Status = dto.Status;
        await _db.SaveChangesAsync();
        return Ok(new { child.Id, child.Status });
    }
}
