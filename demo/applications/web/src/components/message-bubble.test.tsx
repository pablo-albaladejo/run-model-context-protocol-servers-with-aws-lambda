import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MessageBubble from "./message-bubble";

describe("MessageBubble", () => {
  it("should render user message correctly", () => {
    render(
      <MessageBubble
        message="Hello, world!"
        timestamp="2023-01-01T00:00:00.000Z"
        sender="user"
      />
    );

    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
    expect(screen.getByText("Hello, world!").closest("div")).toHaveClass(
      "message-user"
    );
  });

  it("should render assistant message correctly", () => {
    render(
      <MessageBubble
        message="Hi there!"
        timestamp="2023-01-01T00:00:00.000Z"
        sender="assistant"
      />
    );

    expect(screen.getByText("Hi there!")).toBeInTheDocument();
    expect(screen.getByText("Hi there!").closest("div")).toHaveClass(
      "message-assistant"
    );
  });

  it("should render typing indicator when isTyping is true", () => {
    render(
      <MessageBubble
        message="Typing message"
        timestamp="2023-01-01T00:00:00.000Z"
        sender="assistant"
        isTyping={true}
      />
    );

    expect(screen.getByText("Typing message")).toBeInTheDocument();
    // Check for typing indicator dots
    const dots = document.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });
});
