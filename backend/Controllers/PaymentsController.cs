using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase {
    private readonly AppDbContext _db;

    public PaymentsController(AppDbContext db) {
        _db = db;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserRole() =>
        User.FindFirstValue(ClaimTypes.Role)!;

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
                p.EventId, EventName = p.Event != null ? p.Event.Name : null,
                p.Amount, p.Type, p.Status, p.Reference, p.CreatedAt
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
}
