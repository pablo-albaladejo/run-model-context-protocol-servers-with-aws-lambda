export interface User {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date;
}

export enum UserRole {
  CHAT_USER = "chat_user",
  ADMIN = "admin",
}

export class UserEntity implements User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
    public readonly lastLoginAt?: Date
  ) {}

  static create(username: string, email: string, role: UserRole): UserEntity {
    return new UserEntity(
      crypto.randomUUID(),
      username,
      email,
      role,
      new Date()
    );
  }

  canAccessChat(): boolean {
    return this.role === UserRole.CHAT_USER;
  }

  canAccessAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  updateLastLogin(): UserEntity {
    return new UserEntity(
      this.id,
      this.username,
      this.email,
      this.role,
      this.createdAt,
      new Date()
    );
  }
}
