using System.Security.Claims;
using System.Text.RegularExpressions;
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
        if (dto.EndDate.HasValue && dto.EndDate.Value.Date < dto.Date.Date)
            return BadRequest(new { message = "To Date cannot be before Start Date." });

        var eventCode = await GenerateNextEventCode(dto.Name, dto.Date);

        var ev = new Event {
            Name = dto.Name,
            EventCode = eventCode,
            IsCamp = dto.IsCamp,
            Status = "Active",
            StatusReason = null,
            Date = dto.Date,
            EndDate = dto.EndDate,
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

    // PUT /api/events/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> UpdateEvent(int id, UpdateEventDto dto) {
        if (dto.EndDate.HasValue && dto.EndDate.Value.Date < dto.Date.Date)
            return BadRequest(new { message = "To Date cannot be before Start Date." });

        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();

        ev.Name = dto.Name;
        ev.IsCamp = dto.IsCamp;
        ev.Date = dto.Date;
        ev.EndDate = dto.EndDate;
        ev.CostPerChild = dto.CostPerChild;
        ev.FlatCost = dto.FlatCost;
        ev.ExtraExpenses = dto.ExtraExpenses;
        ev.Description = dto.Description;

        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    // DELETE /api/events/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> DeleteEvent(int id) {
        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();

        _db.Events.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/events/{id}/postpone
    [HttpPost("{id:int}/postpone")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> PostponeEvent(int id, EventStatusActionDto dto) {
        var reason = dto.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Reason is required when postponing an event." });

        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();

        ev.Status = "Postponed";
        ev.StatusReason = reason;
        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    // POST /api/events/{id}/cancel
    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> CancelEvent(int id, EventStatusActionDto dto) {
        var reason = dto.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Reason is required when cancelling an event." });

        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();

        ev.Status = "Cancelled";
        ev.StatusReason = reason;
        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    private async Task<string> GenerateNextEventCode(string eventName, DateTime eventDate) {
        var prefix = BuildPrefix(eventName);
        var year = eventDate.Year;

        var existingCodes = await _db.Events
            .Where(e => e.Date.Year == year && e.EventCode != null)
            .Select(e => e.EventCode!)
            .ToListAsync();

        var maxSequence = 0;
        foreach (var code in existingCodes) {
            var match = Regex.Match(code, @"^[A-Z0-9]{2,4}(\d{3})-" + year + @"$");
            if (!match.Success) continue;
            if (int.TryParse(match.Groups[1].Value, out var seq) && seq > maxSequence) {
                maxSequence = seq;
            }
        }

        var nextSequence = maxSequence + 1;
        return $"{prefix}{nextSequence:000}-{year}";
    }

    private static string BuildPrefix(string name) {
        var tokens = Regex.Matches(name.ToUpperInvariant(), @"[A-Z0-9]+")
            .Select(m => m.Value)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .ToList();

        if (tokens.Count == 0) return "EV";
        if (tokens.Count == 1) {
            var one = tokens[0];
            return one.Length >= 2 ? one[..2] : (one + "X")[..2];
        }

        return string.Concat(tokens.Take(4).Select(t => t[0]));
    }
}
