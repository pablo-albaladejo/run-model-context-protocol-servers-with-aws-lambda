import { ChatMessageEntity } from "../entities/ChatMessage";

export interface ChatMessageRepository {
  save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  findBySessionId(sessionId: string): Promise<ChatMessageEntity[]>;
  findBySessionIdAndDateRange(
    sessionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ChatMessageEntity[]>;
  countBySessionId(sessionId: string): Promise<number>;
  countByDateRange(startDate: Date, endDate: Date): Promise<number>;
  countByContentPattern(pattern: string): Promise<number>;
  deleteBySessionId(sessionId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
}
