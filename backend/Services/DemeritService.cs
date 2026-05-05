using AdventurersApi.Data;
using AdventurersApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AdventurersApi.Services;

public sealed class DemeritChildSummary {
    public int ActiveCount { get; init; }
    public bool IsCampDelisted { get; init; }
    public int PendingApprovalCount { get; init; }
}

public class DemeritService {
    private static readonly List<string> CountingStatuses = [
        DemeritStatuses.ApprovedActive,
        DemeritStatuses.StopRequested,
        DemeritStatuses.DeleteRequested,
    ];

    private readonly AppDbContext _db;

    public DemeritService(AppDbContext db) {
        _db = db;
    }

    public async Task<DemeritChildSummary> RefreshChildAsync(Child child, CancellationToken cancellationToken = default) {
        var summaries = await RefreshChildrenAsync([child], cancellationToken);
        return summaries[child.Id];
    }

    public async Task<Dictionary<int, DemeritChildSummary>> RefreshChildrenAsync(IReadOnlyCollection<Child> children, CancellationToken cancellationToken = default) {
        var summaries = children.ToDictionary(
            child => child.Id,
            _ => new DemeritChildSummary { ActiveCount = 0, IsCampDelisted = false, PendingApprovalCount = 0 }
        );

        if (children.Count == 0) {
            return summaries;
        }

        var now = DateTime.UtcNow;
        var childIds = children.Select(child => child.Id).ToList();

        var expiring = await _db.DemeritRecords
            .Where(record => childIds.Contains(record.ChildId)
                && CountingStatuses.Contains(record.Status)
                && record.ExpiresAt.HasValue
                && record.ExpiresAt.Value <= now)
            .ToListAsync(cancellationToken);

        foreach (var record in expiring) {
            record.Status = DemeritStatuses.Expired;
            record.ExpiredAt = now;
        }

        var activeCounts = await _db.DemeritRecords
            .Where(record => childIds.Contains(record.ChildId)
                && CountingStatuses.Contains(record.Status)
                && (!record.ExpiresAt.HasValue || record.ExpiresAt.Value > now))
            .GroupBy(record => record.ChildId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Key, item => item.Count, cancellationToken);

        var pendingCounts = await _db.DemeritRecords
            .Where(record => childIds.Contains(record.ChildId) && record.Status == DemeritStatuses.PendingApproval)
            .GroupBy(record => record.ChildId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Key, item => item.Count, cancellationToken);

        foreach (var child in children) {
            var activeCount = activeCounts.GetValueOrDefault(child.Id, 0);
            var pendingCount = pendingCounts.GetValueOrDefault(child.Id, 0);
            var isCampDelisted = activeCount >= 5;

            child.DemeritCount = activeCount;
            child.IsDelistedFromCamps = isCampDelisted;

            summaries[child.Id] = new DemeritChildSummary {
                ActiveCount = activeCount,
                IsCampDelisted = isCampDelisted,
                PendingApprovalCount = pendingCount,
            };
        }

        if (expiring.Count > 0 || children.Any(child => _db.Entry(child).State == EntityState.Modified)) {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return summaries;
    }

    public async Task<bool> IsCampPaymentBlockedAsync(int childId, CancellationToken cancellationToken = default) {
        var child = await _db.Children.FirstOrDefaultAsync(item => item.Id == childId, cancellationToken);
        if (child == null) {
            return false;
        }

        var summary = await RefreshChildAsync(child, cancellationToken);
        return summary.IsCampDelisted;
    }
}