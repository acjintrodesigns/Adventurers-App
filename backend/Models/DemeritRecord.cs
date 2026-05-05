namespace AdventurersApi.Models;

public static class DemeritStatuses {
    public const string PendingApproval = "PendingApproval";
    public const string ApprovedActive = "ApprovedActive";
    public const string Rejected = "Rejected";
    public const string StopRequested = "StopRequested";
    public const string Stopped = "Stopped";
    public const string DeleteRequested = "DeleteRequested";
    public const string Deleted = "Deleted";
    public const string Expired = "Expired";
}

public class DemeritRecord {
    public int Id { get; set; }
    public int ChildId { get; set; }
    public Child? Child { get; set; }
    public int SubmittedByTeacherId { get; set; }
    public User? SubmittedByTeacher { get; set; }
    public int? ApprovedByDirectorId { get; set; }
    public User? ApprovedByDirector { get; set; }
    public int? StopRequestedById { get; set; }
    public User? StopRequestedBy { get; set; }
    public int? StoppedByDirectorId { get; set; }
    public User? StoppedByDirector { get; set; }
    public int? DeleteRequestedById { get; set; }
    public User? DeleteRequestedBy { get; set; }
    public int? DeletedByDirectorId { get; set; }
    public User? DeletedByDirector { get; set; }
    public string Reason { get; set; } = "";
    public string Consequence { get; set; } = "";
    public string Remedy { get; set; } = "";
    public string Status { get; set; } = DemeritStatuses.PendingApproval;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? StopRequestedAt { get; set; }
    public string? StopReason { get; set; }
    public DateTime? StoppedAt { get; set; }
    public DateTime? DeleteRequestedAt { get; set; }
    public string? DeleteReason { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime? ExpiredAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}