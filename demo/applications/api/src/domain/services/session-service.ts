export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly lastActivity: Date;
}

export interface SessionService {
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateLastActivity(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getActiveSessions(): Promise<Session[]>;
  countActiveSessions(): Promise<number>;
}
