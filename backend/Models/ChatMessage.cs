namespace AdventurersApi.Models;
public class ChatMessage {
    public int Id { get; set; }
    public string ClassRoom { get; set; } = ""; // class name
    public int SenderId { get; set; }
    public User? Sender { get; set; }
    public string Message { get; set; } = "";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
