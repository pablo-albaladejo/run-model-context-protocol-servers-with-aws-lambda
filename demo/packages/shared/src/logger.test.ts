import { describe, expect, it, vi } from "vitest";
import { Logger, logger } from "./logger";

describe("Logger", () => {
  it("should create a logger instance using singleton pattern", () => {
    const loggerInstance = Logger.getInstance();
    expect(loggerInstance).toBeInstanceOf(Logger);
    expect(loggerInstance).toBe(logger);
  });

  it("should log messages with different levels", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("test message");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("test message")
    );
    consoleSpy.mockRestore();
  });

  it("should log error messages", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("error message");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("error message")
    );
    consoleSpy.mockRestore();
  });
});
