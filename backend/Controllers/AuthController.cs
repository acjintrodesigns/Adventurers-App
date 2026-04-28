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
        var allowedRoles = new[] { "Director", "Teacher", "Parent" };
        if (!allowedRoles.Contains(dto.Role))
            return BadRequest(new { message = "Invalid role. Must be Director, Teacher, or Parent." });

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
}
