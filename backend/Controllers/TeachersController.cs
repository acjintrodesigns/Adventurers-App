using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.DTOs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/teachers")]
[Authorize]
public class TeachersController : ControllerBase {
    private readonly AppDbContext _db;

    public TeachersController(AppDbContext db) {
        _db = db;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    [HttpGet]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> GetTeachers() {
        var teachers = await _db.TeacherRegistrations
            .AsNoTracking()
            .Include(reg => reg.User)
            .OrderByDescending(reg => reg.CreatedAt)
            .Select(reg => new {
                reg.Id,
                reg.UserId,
                Email = reg.User != null ? reg.User.Email : null,
                Role = reg.User != null ? reg.User.Role : null,
                reg.FullName,
                reg.DateOfBirth,
                reg.DocumentType,
                reg.DocumentNumber,
                reg.Phone,
                reg.Address,
                reg.EmergencyContactName,
                reg.EmergencyContactPhone,
                reg.PhotoUrl,
                reg.MedicalAidInfo,
                reg.UploadsJson,
                reg.IndemnitySigned,
                reg.IndemnitySignedAt,
                reg.IndemnitySignedByName,
                reg.IndemnitySignerRelationship,
                reg.Status,
                reg.AssignedClass,
                reg.CreatedAt,
                reg.UpdatedAt,
            })
            .ToListAsync();

        return Ok(teachers);
    }

    [HttpGet("me")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetMyRegistration() {
        var userId = GetUserId();
        var registration = await _db.TeacherRegistrations
            .Include(reg => reg.User)
            .FirstOrDefaultAsync(reg => reg.UserId == userId);

        if (registration == null)
            return NotFound(new { message = "Teacher registration not found." });

        return Ok(MapRegistration(registration));
    }

    [HttpPut("me")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> UpsertMyRegistration(UpsertTeacherRegistrationDto dto) {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return Unauthorized();

        var normalizedType = dto.DocumentType?.Trim().ToUpperInvariant();
        if (normalizedType is not ("ID" or "PASSPORT"))
            return BadRequest(new { message = "Document type must be ID or Passport." });

        var registration = await _db.TeacherRegistrations.FirstOrDefaultAsync(reg => reg.UserId == userId);
        if (registration == null) {
            registration = new TeacherRegistration {
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
            };
            _db.TeacherRegistrations.Add(registration);
        }

        registration.FullName = dto.FullName.Trim();
        registration.DateOfBirth = dto.DateOfBirth;
        registration.DocumentType = normalizedType == "PASSPORT" ? "Passport" : "ID";
        registration.DocumentNumber = string.IsNullOrWhiteSpace(dto.DocumentNumber) ? null : dto.DocumentNumber.Trim();
        registration.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
        registration.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim();
        registration.EmergencyContactName = string.IsNullOrWhiteSpace(dto.EmergencyContactName) ? null : dto.EmergencyContactName.Trim();
        registration.EmergencyContactPhone = string.IsNullOrWhiteSpace(dto.EmergencyContactPhone) ? null : dto.EmergencyContactPhone.Trim();
        registration.PhotoUrl = dto.PhotoUrl;
        registration.MedicalAidInfo = string.IsNullOrWhiteSpace(dto.MedicalAidInfo) ? null : dto.MedicalAidInfo.Trim();
        registration.UploadsJson = dto.UploadsJson;

        if (!string.IsNullOrWhiteSpace(dto.IndemnitySignatureDataUrl)) {
            registration.IndemnitySigned = true;
            registration.IndemnitySignedAt = DateTime.UtcNow;
            registration.IndemnitySignedByName = string.IsNullOrWhiteSpace(dto.IndemnitySignedByName)
                ? dto.FullName.Trim()
                : dto.IndemnitySignedByName.Trim();
            registration.IndemnitySignerRelationship = string.IsNullOrWhiteSpace(dto.IndemnitySignerRelationship)
                ? "Teacher"
                : dto.IndemnitySignerRelationship.Trim();
            registration.IndemnitySignatureDataUrl = dto.IndemnitySignatureDataUrl;
        }

        registration.Status = "Pending";
        registration.UpdatedAt = DateTime.UtcNow;

        user.Name = registration.FullName;
        user.Phone = registration.Phone;
        user.Address = registration.Address;
        user.EmergencyContactName = registration.EmergencyContactName;
        user.EmergencyContactPhone = registration.EmergencyContactPhone;
        user.PhotoUrl = registration.PhotoUrl;

        await _db.SaveChangesAsync();

        return Ok(MapRegistration(registration));
    }

    [HttpPut("{id:int}/assign-class")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> AssignClass(int id, AssignTeacherClassDto dto) {
        if (string.IsNullOrWhiteSpace(dto.AssignedClass))
            return BadRequest(new { message = "Assigned class is required." });

        var registration = await _db.TeacherRegistrations.FindAsync(id);
        if (registration == null)
            return NotFound(new { message = "Teacher registration not found." });

        registration.AssignedClass = dto.AssignedClass.Trim();
        registration.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { registration.Id, registration.AssignedClass });
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateTeacherRegistrationStatusDto dto) {
        var allowedStatuses = new[] { "Pending", "Approved", "Rejected" };
        if (!allowedStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Invalid status." });

        var registration = await _db.TeacherRegistrations.FindAsync(id);
        if (registration == null)
            return NotFound(new { message = "Teacher registration not found." });

        registration.Status = dto.Status;
        registration.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { registration.Id, registration.Status });
    }

    [HttpGet("my-class")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetMyAssignedClass() {
        var userId = GetUserId();
        var assignedClass = await _db.TeacherRegistrations
            .AsNoTracking()
            .Where(reg => reg.UserId == userId)
            .Select(reg => reg.AssignedClass)
            .FirstOrDefaultAsync();

        return Ok(new { assignedClass });
    }

    private static object MapRegistration(TeacherRegistration registration) => new {
        registration.Id,
        registration.UserId,
        registration.FullName,
        registration.DateOfBirth,
        registration.DocumentType,
        registration.DocumentNumber,
        registration.Phone,
        registration.Address,
        registration.EmergencyContactName,
        registration.EmergencyContactPhone,
        registration.PhotoUrl,
        registration.MedicalAidInfo,
        registration.UploadsJson,
        registration.IndemnitySigned,
        registration.IndemnitySignedAt,
        registration.IndemnitySignedByName,
        registration.IndemnitySignerRelationship,
        registration.Status,
        registration.AssignedClass,
        registration.CreatedAt,
        registration.UpdatedAt,
    };
}
