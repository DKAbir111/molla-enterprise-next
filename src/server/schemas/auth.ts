import { z } from 'zod'

/**
 * Request shapes for the auth endpoints. These mirror the old class-validator
 * DTOs one rule at a time, so an existing client sees identical acceptance.
 */

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'name should not be empty'),
  email: z.string().email('email must be an email'),
  password: z.string().min(6, 'password must be longer than or equal to 6 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('email must be an email'),
  password: z.string().min(6, 'password must be longer than or equal to 6 characters'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('email must be an email'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token should not be empty'),
  newPassword: z.string().min(6, 'newPassword must be longer than or equal to 6 characters'),
})
