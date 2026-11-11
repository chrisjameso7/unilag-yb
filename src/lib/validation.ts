import { z } from "zod";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const signupSchema = z
  .object({
    email: z.string().trim().toLowerCase().regex(emailPattern, "Enter a valid email address."),
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(200, "That password is too long.")
      .regex(/[a-zA-Z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().regex(emailPattern, "Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const year = z.coerce
  .number({ message: "Enter a year." })
  .int("Enter a whole year.")
  .min(1962, "The university was founded in 1962.")
  .max(2100, "That year is out of range.");

export const profileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Keep your name under 80 characters.")
      .regex(/^[\p{L}\p{M}'\-. ]+$/u, "Use letters, spaces, hyphens and apostrophes only."),
    facultyId: z.coerce.number().int().positive("Choose a faculty."),
    departmentId: z.coerce.number().int().positive("Choose a department."),
    admissionYear: year,
    graduationYear: year,
    biography: z
      .string()
      .trim()
      .min(20, "Your biography needs at least 20 characters.")
      .max(250, "Keep your biography to 250 characters."),
    graduationStatus: z.enum(["in_progress", "graduated"]).default("in_progress"),
    consent: z.literal("on", { message: "You must agree before your page can be published." }),
  })
  .refine((data) => data.graduationYear >= data.admissionYear, {
    path: ["graduationYear"],
    message: "Graduation year cannot be before admission year.",
  })
  .refine((data) => data.graduationYear - data.admissionYear <= 12, {
    path: ["graduationYear"],
    message: "That programme length looks too long. Check the years.",
  });

export const manualVerificationSchema = z.object({
  claimedName: z
    .string()
    .trim()
    .min(3, "Enter your name as it appears on your student ID.")
    .max(80, "Keep your name under 80 characters."),
  matricNumber: z
    .string()
    .trim()
    .min(5, "Enter your matriculation number.")
    .max(24, "That matriculation number is too long.")
    .regex(/^[0-9A-Za-z/\-]+$/, "Use letters, numbers, slashes and hyphens only."),
  note: z.string().trim().max(400, "Keep the note under 400 characters.").optional(),
});

export const profileEditRequestSchema = z.object({
  requestType: z.enum(["deactivation", "removal", "correction", "data_export"]),
  message: z.string().trim().min(10, "Tell us briefly what you need.").max(600),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().regex(emailPattern, "Enter a valid email address."),
});

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(200, "That password is too long.")
      .regex(/[a-zA-Z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const facesSubmissionSchema = z.object({
  personalIntroduction: z
    .string()
    .trim()
    .min(40, "Tell the editors a little about yourself (at least 40 characters).")
    .max(400, "Keep your introduction to 400 characters."),
  quote: z.string().trim().max(160, "Keep your quote to 160 characters.").optional(),
  consent: z.literal("on", {
    message: "Editorial consent is required to submit for Faces of the Year.",
  }),
});

export const facesEditionSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  title: z.string().trim().min(3).max(120),
  introduction: z.string().trim().max(4000).default(""),
});

export type FieldErrors = Record<string, string>;

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
