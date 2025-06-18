export interface ChatMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly content: string;
  readonly sender: MessageSender;
  readonly timestamp: Date;
  readonly metadata?: Record<string, any>;
}

export enum MessageSender {
  USER = "user",
  ASSISTANT = "assistant",
}

export class ChatMessageEntity implements ChatMessage {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly content: string,
    public readonly sender: MessageSender,
    public readonly timestamp: Date,
    public readonly metadata?: Record<string, any>
  ) {}

  static create(
    sessionId: string,
    content: string,
    sender: MessageSender,
    metadata?: Record<string, any>
  ): ChatMessageEntity {
    return new ChatMessageEntity(
      crypto.randomUUID(),
      sessionId,
      content,
      sender,
      new Date(),
      metadata
    );
  }

  isFromUser(): boolean {
    return this.sender === MessageSender.USER;
  }

  isFromAssistant(): boolean {
    return this.sender === MessageSender.ASSISTANT;
  }

  addMetadata(key: string, value: any): ChatMessageEntity {
    const newMetadata = { ...this.metadata, [key]: value };
    return new ChatMessageEntity(
      this.id,
      this.sessionId,
      this.content,
      this.sender,
      this.timestamp,
      newMetadata
    );
  }
}
