using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public class EventsController : ControllerBase {
    private readonly AppDbContext _db;

    public EventsController(AppDbContext db) {
        _db = db;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/events
    [HttpGet]
    public async Task<IActionResult> GetEvents() {
        var events = await _db.Events
            .OrderByDescending(e => e.Date)
            .ToListAsync();
        return Ok(events);
    }

    // GET /api/events/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEvent(int id) {
        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();
        return Ok(ev);
    }

    // POST /api/events
    [HttpPost]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> CreateEvent(CreateEventDto dto) {
        var ev = new Event {
            Name = dto.Name,
            Date = dto.Date,
            CostPerChild = dto.CostPerChild,
            FlatCost = dto.FlatCost,
            ExtraExpenses = dto.ExtraExpenses,
            Description = dto.Description,
            DirectorId = GetUserId(),
        };
        _db.Events.Add(ev);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetEvent), new { id = ev.Id }, ev);
    }
}
