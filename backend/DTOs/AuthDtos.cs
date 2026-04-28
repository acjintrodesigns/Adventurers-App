namespace AdventurersApi.DTOs;
public record RegisterDto(string Name, string Email, string Password, string Role);
public record LoginDto(string Email, string Password);
public record AuthResponseDto(string Token, string Role, string Name);
