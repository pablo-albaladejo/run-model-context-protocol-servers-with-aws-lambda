import { z } from "zod";

export const SendMessageSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(1000, "Message content too long (max 1000 characters)"),
  userId: z.string().min(1, "User ID is required"),
});

export const CreateSessionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const GetSessionSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

export const GetMessagesSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type SendMessageRequest = z.infer<typeof SendMessageSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type GetSessionRequest = z.infer<typeof GetSessionSchema>;
export type GetMessagesRequest = z.infer<typeof GetMessagesSchema>;
