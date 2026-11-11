import { describe, expect, it } from "vitest";
import { profileSchema, signupSchema, manualVerificationSchema, facesSubmissionSchema } from "@/lib/validation";
import { safeInternalPath } from "@/lib/actions/types";
import { slugify } from "@/lib/profile-service";

const validProfile = {
  fullName: "Adaeze Okonkwo",
  facultyId: "1",
  departmentId: "2",
  admissionYear: "2022",
  graduationYear: "2026",
  biography: "Came for the law, stayed for the moot court drama.",
  graduationStatus: "in_progress",
  consent: "on",
};

describe("profile validation", () => {
  it("accepts a complete profile", () => {
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });
  it("requires consent", () => {
    expect(profileSchema.safeParse({ ...validProfile, consent: null }).success).toBe(false);
  });
  it("caps the bio at 250 characters (plan §4.3)", () => {
    expect(profileSchema.safeParse({ ...validProfile, biography: "x".repeat(251) }).success).toBe(false);
  });
  it("does not let graduation precede admission", () => {
    expect(profileSchema.safeParse({ ...validProfile, graduationYear: "2020" }).success).toBe(false);
  });
  it("rejects markup in names", () => {
    expect(profileSchema.safeParse({ ...validProfile, fullName: "<script>x</script>" }).success).toBe(false);
  });
  it("accepts names with accents and apostrophes", () => {
    expect(profileSchema.safeParse({ ...validProfile, fullName: "Ọlá O'Neil-Adébáyọ̀" }).success).toBe(true);
  });
});

describe("signup validation", () => {
  it("requires a strong, matching password", () => {
    expect(signupSchema.safeParse({ email: "a@b.co", password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.co", password: "longenough1", confirmPassword: "different1" }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.co", password: "longenough1", confirmPassword: "longenough1" }).success).toBe(true);
  });
});

describe("other schemas", () => {
  it("validates matric numbers", () => {
    expect(manualVerificationSchema.safeParse({ claimedName: "Tunde Ade", matricNumber: "190405001" }).success).toBe(true);
    expect(manualVerificationSchema.safeParse({ claimedName: "Tunde Ade", matricNumber: "19; drop" }).success).toBe(false);
  });
  it("requires editorial consent for Faces", () => {
    const intro = "I spent four years between the lagoon and the library.";
    expect(facesSubmissionSchema.safeParse({ personalIntroduction: intro, consent: "on" }).success).toBe(true);
    expect(facesSubmissionSchema.safeParse({ personalIntroduction: intro }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("only allows internal redirect paths", () => {
    expect(safeInternalPath("/dashboard", "/")).toBe("/dashboard");
    expect(safeInternalPath("//evil.com", "/")).toBe("/");
    expect(safeInternalPath("https://evil.com", "/")).toBe("/");
    expect(safeInternalPath("/\\evil.com", "/")).toBe("/");
    expect(safeInternalPath(null, "/x")).toBe("/x");
  });
  it("makes URL-safe usernames", () => {
    expect(slugify("Adaeze Okonkwo")).toBe("adaeze-okonkwo");
    expect(slugify("Ọlá  Adébáyọ̀!!")).toBe("ola-adebayo");
    expect(slugify("x".repeat(80) + " y")).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
