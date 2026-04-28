using Microsoft.AspNetCore.SignalR;

namespace AdventurersApi.Hubs;
public class ChatHub : Hub {
    public async Task JoinRoom(string classRoom) {
        await Groups.AddToGroupAsync(Context.ConnectionId, classRoom);
    }
    public async Task SendMessage(string classRoom, string message) {
        await Clients.Group(classRoom).SendAsync("ReceiveMessage", Context.ConnectionId, message);
    }
}
