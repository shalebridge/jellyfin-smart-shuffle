using MediaBrowser.Common.Configuration;
using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Jellyfin.Plugin.SmartShuffle.Store;

public sealed class SmartShuffleStore
{
    private readonly string _dataDir;
    private readonly string _dbPath;

    public SmartShuffleStore(IApplicationPaths applicationPaths)
    {
        _dataDir = Path.Combine(
            applicationPaths.DataPath,
            "smartshuffle");

        Directory.CreateDirectory(_dataDir);

        _dbPath = Path.Combine(_dataDir, "smartshuffle.db");

        Initialize();
    }

    private void Initialize()
    {
        using var connection = Open();

        using (var command = connection.CreateCommand())
        {
            command.CommandText = """
            CREATE TABLE IF NOT EXISTS SmartShuffleBucket (
                UserId TEXT NOT NULL,
                ScopeKey TEXT NOT NULL,
                ItemId TEXT NOT NULL,
                Position INTEGER NOT NULL,
                Queued INTEGER NOT NULL DEFAULT 0,
                Played INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL,
                QueuedAt TEXT NULL,
                PlayedAt TEXT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS UX_SmartShuffleBucket_UserScopeItem
                ON SmartShuffleBucket(UserId, ScopeKey, ItemId);

            CREATE INDEX IF NOT EXISTS IX_SmartShuffleBucket_UserScope
                ON SmartShuffleBucket(UserId, ScopeKey, Played, Position);

            CREATE INDEX IF NOT EXISTS IX_SmartShuffleBucket_PlaybackStart
                ON SmartShuffleBucket(UserId, ItemId, Queued, Played);
            """;

            command.ExecuteNonQuery();
        }

        TryAddColumn(connection, "ALTER TABLE SmartShuffleBucket ADD COLUMN Queued INTEGER NOT NULL DEFAULT 0;");
        TryAddColumn(connection, "ALTER TABLE SmartShuffleBucket ADD COLUMN QueuedAt TEXT NULL;");
        TryAddColumn(connection, "ALTER TABLE SmartShuffleBucket ADD COLUMN PlayedAt TEXT NULL;");
    }

    public void DeleteDatabaseDirectory()
    {
        if (!Directory.Exists(_dataDir))
        {
            return;
        }

        Directory.Delete(_dataDir, recursive: true);
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection($"Data Source={_dbPath}");
        connection.Open();
        return connection;
    }

    private static void TryAddColumn(SqliteConnection connection, string sql)
    {
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.ExecuteNonQuery();
        }
        catch (SqliteException ex) when (
            ex.SqliteErrorCode == 1 &&
            ex.Message.Contains("duplicate column", StringComparison.OrdinalIgnoreCase))
        {
            // Existing database already has the column.
        }
    }

    private static void PruneMissingCandidates(
        SqliteConnection connection,
        SqliteTransaction tx,
        string userId,
        string scopeKey,
        IReadOnlyList<string> candidateItemIds)
    {
        var validIds = candidateItemIds
            .Where(i => !string.IsNullOrWhiteSpace(i))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var existing = new List<string>();

        using (var select = connection.CreateCommand())
        {
            select.Transaction = tx;
            select.CommandText = """
                SELECT ItemId
                FROM SmartShuffleBucket
                WHERE UserId = $userId 
                    AND ScopeKey = $scopeKey;
            """;

            select.Parameters.AddWithValue("$userId", userId);
            select.Parameters.AddWithValue("$scopeKey", scopeKey);

            using var reader = select.ExecuteReader();

            while (reader.Read())
            {
                existing.Add(reader.GetString(0));
            }
        }

        foreach (var itemId in existing)
        {
            if (validIds.Contains(itemId))
            {
                continue;
            }

            using var delete = connection.CreateCommand();
            delete.Transaction = tx;

            delete.CommandText = """
                DELETE FROM SmartShuffleBucket
                WHERE UserId = $userId
                    AND ScopeKey = $scopeKey
                    AND ItemId = $itemId;
            """;

            delete.Parameters.AddWithValue("$userId", userId);
            delete.Parameters.AddWithValue("$scopeKey", scopeKey);
            delete.Parameters.AddWithValue("$itemId", itemId);

            delete.ExecuteNonQuery();
        }
    }

    public IReadOnlyList<string> GetOrCreateQueue(
        string userId,
        string scopeKey,
        IReadOnlyList<string> candidateItemIds)
    {
        using var connection = Open();
        using var tx = connection.BeginTransaction();

        PruneMissingCandidates(connection, tx, userId, scopeKey, candidateItemIds);

        var remaining = GetRemainingQueue(connection, tx, userId, scopeKey);

        if (remaining.Count == 0)
        {
            DeleteBucket(connection, tx, userId, scopeKey);

            var ordered = candidateItemIds
                .Where(i => !string.IsNullOrWhiteSpace(i))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            InsertBucket(connection, tx, userId, scopeKey, ordered);

            remaining = ordered;
        }

        MarkQueued(connection, tx, userId, scopeKey, remaining);

        tx.Commit();

        return remaining;
    }

    public int MarkPlayedFromPlaybackStart(string userId, string itemId)
    {
        using var connection = Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE SmartShuffleBucket
            SET Played = 1,
                PlayedAt = $playedAt
            WHERE UserId = $userId
                AND ItemId = $itemId
                AND Queued = 1
                AND Played = 0;
        """;

        command.Parameters.AddWithValue("$userId", userId);
        command.Parameters.AddWithValue("$itemId", itemId);
        command.Parameters.AddWithValue("$playedAt", DateTimeOffset.UtcNow.ToString("O"));

        return command.ExecuteNonQuery();
    }

    public void Reset(string userId, string scopeKey)
    {
        using var connection = Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            DELETE FROM SmartShuffleBucket
            WHERE UserId = $userId 
                AND ScopeKey = $scopeKey;
        """;

        command.Parameters.AddWithValue("$userId", userId);
        command.Parameters.AddWithValue("$scopeKey", scopeKey);

        command.ExecuteNonQuery();
    }

    public IReadOnlyList<SmartShuffleBucketSummary> GetBucketSummaries(string userId)
    {
        using var connection = Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                ScopeKey,
                COUNT(*) AS Total,
                SUM(CASE WHEN Played = 1 THEN 1 ELSE 0 END) AS Played,
                SUM(CASE WHEN Queued = 1 AND Played = 0 THEN 1 ELSE 0 END) AS Queued,
                SUM(CASE WHEN Played = 0 THEN 1 ELSE 0 END) AS Remaining,
                MIN(CreatedAt) AS CreatedAt,
                MAX(COALESCE(PlayedAt, QueuedAt, CreatedAt)) AS UpdatedAt
            FROM SmartShuffleBucket
            WHERE UserId = $userId
            GROUP BY ScopeKey
            ORDER BY UpdatedAt DESC;
        """;

        command.Parameters.AddWithValue("$userId", userId);

        var result = new List<SmartShuffleBucketSummary>();

        using var reader = command.ExecuteReader();

        while (reader.Read())
        {
            result.Add(new SmartShuffleBucketSummary
            {
                ScopeKey = reader.GetString(0),
                Total = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
                Played = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                Queued = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                Remaining = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
                CreatedAt = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                UpdatedAt = reader.IsDBNull(6) ? string.Empty : reader.GetString(6)
            });
        }

        return result;
    }

    public SmartShuffleStatus GetStatus(string userId, string scopeKey)
    {
        using var connection = Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN Played = 1 THEN 1 ELSE 0 END) AS Played,
                SUM(CASE WHEN Queued = 1 AND Played = 0 THEN 1 ELSE 0 END) AS Queued,
                SUM(CASE WHEN Played = 0 THEN 1 ELSE 0 END) AS Remaining
            FROM SmartShuffleBucket
            WHERE UserId = $userId 
                AND ScopeKey = $scopeKey;
        """;

        command.Parameters.AddWithValue("$userId", userId);
        command.Parameters.AddWithValue("$scopeKey", scopeKey);

        using var reader = command.ExecuteReader();

        if (!reader.Read())
        {
            return new SmartShuffleStatus();
        }

        return new SmartShuffleStatus
        {
            Total = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
            Played = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
            Queued = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
            Remaining = reader.IsDBNull(3) ? 0 : reader.GetInt32(3)
        };
    }

    private static List<string> GetRemainingQueue(
        SqliteConnection connection,
        SqliteTransaction tx,
        string userId,
        string scopeKey)
    {
        using var command = connection.CreateCommand();
        command.Transaction = tx;

        command.CommandText = """
            SELECT ItemId
            FROM SmartShuffleBucket
            WHERE UserId = $userId
                AND ScopeKey = $scopeKey
                AND Played = 0
            ORDER BY Position;
        """;

        command.Parameters.AddWithValue("$userId", userId);
        command.Parameters.AddWithValue("$scopeKey", scopeKey);

        var result = new List<string>();

        using var reader = command.ExecuteReader();

        while (reader.Read())
        {
            result.Add(reader.GetString(0));
        }

        return result;
    }

    private static void DeleteBucket(
        SqliteConnection connection,
        SqliteTransaction tx,
        string userId,
        string scopeKey)
    {
        using var command = connection.CreateCommand();
        command.Transaction = tx;

        command.CommandText = """
            DELETE FROM SmartShuffleBucket
            WHERE UserId = $userId 
                AND ScopeKey = $scopeKey;
        """;

        command.Parameters.AddWithValue("$userId", userId);
        command.Parameters.AddWithValue("$scopeKey", scopeKey);

        command.ExecuteNonQuery();
    }

    private static void InsertBucket(
        SqliteConnection connection,
        SqliteTransaction tx,
        string userId,
        string scopeKey,
        List<string> itemIds)
    {
        for (var i = 0; i < itemIds.Count; i++)
        {
            using var command = connection.CreateCommand();
            command.Transaction = tx;

            command.CommandText = """
                INSERT INTO SmartShuffleBucket
                    (UserId, ScopeKey, ItemId, Position, Queued, Played, CreatedAt)
                VALUES
                    ($userId, $scopeKey, $itemId, $position, 0, 0, $createdAt);
            """;

            command.Parameters.AddWithValue("$userId", userId);
            command.Parameters.AddWithValue("$scopeKey", scopeKey);
            command.Parameters.AddWithValue("$itemId", itemIds[i]);
            command.Parameters.AddWithValue("$position", i);
            command.Parameters.AddWithValue("$createdAt", DateTimeOffset.UtcNow.ToString("O"));

            command.ExecuteNonQuery();
        }
    }

    private static void MarkQueued(
        SqliteConnection connection,
        SqliteTransaction tx,
        string userId,
        string scopeKey,
        IReadOnlyList<string> itemIds)
    {
        foreach (var itemId in itemIds)
        {
            using var command = connection.CreateCommand();
            command.Transaction = tx;

            command.CommandText = """
                UPDATE SmartShuffleBucket
                SET Queued = 1,
                    QueuedAt = COALESCE(QueuedAt, $queuedAt)
                WHERE UserId = $userId
                    AND ScopeKey = $scopeKey
                    AND ItemId = $itemId
                    AND Played = 0;
            """;

            command.Parameters.AddWithValue("$userId", userId);
            command.Parameters.AddWithValue("$scopeKey", scopeKey);
            command.Parameters.AddWithValue("$itemId", itemId);
            command.Parameters.AddWithValue("$queuedAt", DateTimeOffset.UtcNow.ToString("O"));

            command.ExecuteNonQuery();
        }
    }
}

public sealed class SmartShuffleStatus
{
    public int Total { get; set; }

    public int Played { get; set; }

    public int Queued { get; set; }

    public int Remaining { get; set; }
}

public sealed class SmartShuffleBucketSummary
{
    public string ScopeKey { get; set; } = string.Empty;

    public int Total { get; set; }

    public int Played { get; set; }

    public int Queued { get; set; }

    public int Remaining { get; set; }

    public string CreatedAt { get; set; } = string.Empty;

    public string UpdatedAt { get; set; } = string.Empty;
}