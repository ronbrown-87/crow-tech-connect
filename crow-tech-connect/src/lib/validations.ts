import { z } from 'zod';

// Authentication schemas
export const signInSchema = z.object({
  email: z.string()
    .trim()
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .trim()
    .nonempty({ message: "Password is required" })
});

export const signUpSchema = z.object({
  fullName: z.string()
    .trim()
    .nonempty({ message: "Full name is required" })
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" }),
  email: z.string()
    .trim()
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  userType: z.enum(['client', 'service_provider']).refine((val) => val, {
    message: "Please select a valid user type"
  }),
  password: z.string()
    .trim()
    .nonempty({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
    }),
  confirmPassword: z.string()
    .trim()
    .nonempty({ message: "Please confirm your password" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Service request schema
export const serviceRequestSchema = z.object({
  title: z.string()
    .trim()
    .nonempty({ message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" }),
  description: z.string()
    .trim()
    .nonempty({ message: "Description is required" })
    .max(2000, { message: "Description must be less than 2000 characters" }),
  location: z.string()
    .trim()
    .nonempty({ message: "Location is required" })
    .max(500, { message: "Location must be less than 500 characters" }),
  preferredDate: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true; // Optional field
      const selectedDate = new Date(date);
      const now = new Date();
      return selectedDate > now;
    }, { message: "Preferred date must be in the future" }),
  budgetRange: z.string()
    .trim()
    .max(100, { message: "Budget range must be less than 100 characters" })
    .optional()
});

// Profile update schema
export const profileUpdateSchema = z.object({
  fullName: z.string()
    .trim()
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]*$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" })
    .optional(),
  phone: z.string()
    .trim()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, { message: "Invalid phone number format" })
    .optional()
    .or(z.literal("")),
  location: z.string()
    .trim()
    .max(500, { message: "Location must be less than 500 characters" })
    .optional()
    .or(z.literal(""))
});

// Business profile schema for service providers
export const businessProfileSchema = z.object({
  businessName: z.string()
    .trim()
    .max(200, { message: "Business name must be less than 200 characters" })
    .optional()
    .or(z.literal("")),
  businessDescription: z.string()
    .trim()
    .max(1000, { message: "Business description must be less than 1000 characters" })
    .optional()
    .or(z.literal("")),
  hourlyRate: z.number()
    .min(0, { message: "Hourly rate must be positive" })
    .max(10000, { message: "Hourly rate seems too high" })
    .optional(),
  yearsExperience: z.number()
    .min(0, { message: "Years of experience must be positive" })
    .max(100, { message: "Years of experience seems too high" })
    .optional(),
  licenseNumber: z.string()
    .trim()
    .max(100, { message: "License number must be less than 100 characters" })
    .optional()
    .or(z.literal(""))
});

// Contact form schema
export const contactSchema = z.object({
  name: z.string()
    .trim()
    .nonempty({ message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" }),
  email: z.string()
    .trim()
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  message: z.string()
    .trim()
    .nonempty({ message: "Message is required" })
    .max(1000, { message: "Message must be less than 1000 characters" })
});

export type SignInData = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
export type ServiceRequestData = z.infer<typeof serviceRequestSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type BusinessProfileData = z.infer<typeof businessProfileSchema>;
export type ContactData = z.infer<typeof contactSchema>;