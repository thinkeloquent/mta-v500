// Request queue utility to prevent rate limiting
class RequestQueue {
  constructor(maxConcurrent = 5, delayBetweenRequests = 200) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenRequests = delayBetweenRequests;
    this.queue = [];
    this.activeRequests = 0;
    this.lastRequestTime = 0;
  }

  async add(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex((item) => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const queueItem = this.queue.shift();
    this.activeRequests++;

    try {
      // Ensure minimum delay between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.delayBetweenRequests) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayBetweenRequests - timeSinceLastRequest),
        );
      }

      this.lastRequestTime = Date.now();
      const result = await queueItem.requestFn();
      queueItem.resolve(result);
    } catch (error) {
      // Handle rate limit errors with exponential backoff
      if (error.status === 429) {
        console.log('Rate limited, re-queuing request with delay...');

        // Show rate limit notification to user
        if (typeof window !== 'undefined' && window.showRateLimitNotification) {
          window.showRateLimitNotification(
            'Gallery loading slowed due to rate limits',
            error.retryAfter || 60,
          );
        }

        // Re-queue with lower priority after delay
        setTimeout(() => {
          this.queue.unshift({ ...queueItem, priority: Math.max(0, queueItem.priority - 1) });
          this.processQueue();
        }, 2000);
      } else {
        queueItem.reject(error);
      }
    } finally {
      this.activeRequests--;
      // Process next item in queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  clear() {
    this.queue = [];
  }

  getQueueSize() {
    return this.queue.length;
  }

  getActiveCount() {
    return this.activeRequests;
  }
}

// Global request queue for gallery images
export const imageRequestQueue = new RequestQueue(3, 300); // Max 3 concurrent, 300ms between requests

// Helper function to queue API requests
export const queueApiRequest = async (requestFn, priority = 0) => {
  return imageRequestQueue.add(requestFn, priority);
};
