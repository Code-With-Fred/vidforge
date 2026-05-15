/**
 * Simple in-memory lock system for preventing concurrent operations
 * For production, consider using Redis for distributed locking
 */

interface Lock {
  videoId: string;
  acquiredAt: number;
  timeout: number;
}

class LockManager {
  private locks = new Map<string, Lock>();
  private readonly DEFAULT_TIMEOUT = 60 * 60 * 1000; // 1 hour

  /**
   * Try to acquire a lock for a video
   * Returns true if lock acquired, false if already locked
   */
  acquireLock(videoId: string, timeoutMs = this.DEFAULT_TIMEOUT): boolean {
    // Clean up expired locks
    this.cleanupExpiredLocks();

    if (this.locks.has(videoId)) {
      const lock = this.locks.get(videoId)!;
      // Check if lock has expired
      if (Date.now() - lock.acquiredAt > lock.timeout) {
        this.locks.delete(videoId);
      } else {
        return false; // Lock still held
      }
    }

    this.locks.set(videoId, {
      videoId,
      acquiredAt: Date.now(),
      timeout: timeoutMs,
    });

    return true;
  }

  /**
   * Release a lock
   */
  releaseLock(videoId: string): boolean {
    return this.locks.delete(videoId);
  }

  /**
   * Check if a lock is held
   */
  isLocked(videoId: string): boolean {
    if (!this.locks.has(videoId)) return false;

    const lock = this.locks.get(videoId)!;
    if (Date.now() - lock.acquiredAt > lock.timeout) {
      this.locks.delete(videoId);
      return false;
    }

    return true;
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): Lock[] {
    return Array.from(this.locks.values());
  }

  /**
   * Clean up expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [videoId, lock] of this.locks.entries()) {
      if (now - lock.acquiredAt > lock.timeout) {
        this.locks.delete(videoId);
      }
    }
  }

  /**
   * Clear all locks (use with caution)
   */
  clearAllLocks(): void {
    this.locks.clear();
  }
}

export const lockManager = new LockManager();
