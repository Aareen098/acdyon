class CircuitBreaker {
  constructor({
    failureThreshold = 3,
    resetTimeout = 30_000,
  } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;

    this.failureCount = 0;
    this.state = "CLOSED";
    this.openedAt = null;
  }

  async execute(action) {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.openedAt;

      if (elapsed < this.resetTimeout) {
        throw new Error(
          "Upstream source temporarily unavailable. Circuit breaker is open."
        );
      }

      this.state = "HALF_OPEN";
    }

    try {
      const result = await action();

      this.onSuccess();

      return result;
    } catch (error) {
      this.onFailure();

      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.openedAt = null;
  }

  onFailure() {
    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = Date.now();

      console.warn(
        `Circuit breaker opened after ${this.failureCount} failures.`
      );
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
    };
  }
}

module.exports = { CircuitBreaker };