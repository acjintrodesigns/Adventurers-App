using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AdventurersApi.Data;
using AdventurersApi.Hubs;
using AdventurersApi.Models;

namespace AdventurersApi.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatController(AppDbContext db, IHubContext<ChatHub> hubContext) {
        _db = db;
        _hubContext = hubContext;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/chat/{classRoom}/messages
    [HttpGet("{classRoom}/messages")]
    public async Task<IActionResult> GetMessages(string classRoom, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) {
        var messages = await _db.ChatMessages
            .Include(m => m.Sender)
            .Where(m => m.ClassRoom == classRoom)
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new {
                m.Id, m.ClassRoom,
                m.SenderId, SenderName = m.Sender!.Name,
                m.Message, m.SentAt
            })
            .ToListAsync();

        return Ok(messages.OrderBy(m => m.SentAt));
    }

    // POST /api/chat/{classRoom}/messages
    [HttpPost("{classRoom}/messages")]
    public async Task<IActionResult> PostMessage(string classRoom, [FromBody] SendMessageDto dto) {
        var userId = GetUserId();
        var chatMessage = new ChatMessage {
            ClassRoom = classRoom,
            SenderId = userId,
            Message = dto.Message,
        };
        _db.ChatMessages.Add(chatMessage);
        await _db.SaveChangesAsync();

        var sender = await _db.Users.FindAsync(userId);

        // Broadcast via SignalR
        await _hubContext.Clients.Group(classRoom).SendAsync("ReceiveMessage", new {
            chatMessage.Id, chatMessage.ClassRoom,
            chatMessage.SenderId, SenderName = sender?.Name,
            chatMessage.Message, chatMessage.SentAt
        });

        return Ok(new { chatMessage.Id, chatMessage.ClassRoom, chatMessage.SenderId, chatMessage.Message, chatMessage.SentAt });
    }
}

public record SendMessageDto(string Message);
