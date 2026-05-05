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
[Route("api/auth")]
public class AuthController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;

    public AuthController(AppDbContext db, TokenService tokenService) {
        _db = db;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto) {
        var allowedRoles = new[] { "Director", "Teacher", "Parent", "Donor" };
        if (!allowedRoles.Contains(dto.Role))
            return BadRequest(new { message = "Invalid role. Must be Director, Teacher, Parent, or Donor." });

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return Conflict(new { message = "A user with this email already exists." });

        var user = new User {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        if (string.Equals(user.Role, "Teacher", StringComparison.OrdinalIgnoreCase)) {
            var existingRegistration = await _db.TeacherRegistrations.FirstOrDefaultAsync(r => r.UserId == user.Id);
            if (existingRegistration == null) {
                _db.TeacherRegistrations.Add(new TeacherRegistration {
                    UserId = user.Id,
                    FullName = user.Name,
                    Phone = user.Phone,
                    Address = user.Address,
                    EmergencyContactName = user.EmergencyContactName,
                    EmergencyContactPhone = user.EmergencyContactPhone,
                    PhotoUrl = user.PhotoUrl,
                    Status = "Pending",
                });
                await _db.SaveChangesAsync();
            }
        }

        var token = _tokenService.GenerateToken(user);
        return CreatedAtAction(nameof(Register), new AuthResponseDto(token, user.Role, user.Name));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto) {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        var token = _tokenService.GenerateToken(user);
        return Ok(new AuthResponseDto(token, user.Role, user.Name));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe() {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        return Ok(MapProfile(user));
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe(UpdateProfileDto dto) {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (dto.Name != null) user.Name = dto.Name.Trim();
        if (dto.Phone != null) user.Phone = dto.Phone.Trim();
        if (dto.Address != null) user.Address = dto.Address.Trim();
        if (dto.Relationship != null) user.Relationship = dto.Relationship.Trim();
        if (dto.EmergencyContactName != null) user.EmergencyContactName = dto.EmergencyContactName.Trim();
        if (dto.EmergencyContactPhone != null) user.EmergencyContactPhone = dto.EmergencyContactPhone.Trim();
        if (dto.PhotoUrl != null) user.PhotoUrl = dto.PhotoUrl;
        if (dto.SecondaryGuardianJson != null) user.SecondaryGuardianJson = dto.SecondaryGuardianJson;

        await _db.SaveChangesAsync();
        return Ok(MapProfile(user));
    }

    private static ProfileResponseDto MapProfile(User u) => new(
        u.Id, u.Name, u.Email, u.Role,
        u.Phone, u.Address, u.Relationship,
        u.EmergencyContactName, u.EmergencyContactPhone,
        u.CreatedAt, u.PhotoUrl, u.SecondaryGuardianJson
    );
}
