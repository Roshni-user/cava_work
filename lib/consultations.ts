import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  name: 200,
  email: 320,
  phone: 40,
  company: 200,
  message: 5000,
} as const;

export type ConsultationInput = {
  name: string;
  email: string;
  phone: string;
  companyName: string | null;
  message: string;
};

export class ConsultationValidationError extends Error {
  readonly status = 400;

  constructor(readonly fields: Record<string, string>) {
    super("Check the consultation fields and try again.");
    this.name = "ConsultationValidationError";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseConsultation(body: unknown): ConsultationInput {
  if (!isRecord(body)) {
    throw new ConsultationValidationError({
      body: "Request body must be a JSON object.",
    });
  }

  const name = text(body.name);
  const email = text(body.email);
  const phone = text(body.phone);
  const company = text(body.company);
  const message = text(body.message);
  const fields: Record<string, string> = {};

  if (!name) {
    fields.name = "Name is required.";
  } else if (name.length > LIMITS.name) {
    fields.name = `Name must be ${LIMITS.name} characters or fewer.`;
  }

  if (!email) {
    fields.email = "Email is required.";
  } else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
    fields.email = "Email must be a valid email address.";
  }

  if (!phone) {
    fields.phone = "Phone is required.";
  } else if (phone.length > LIMITS.phone) {
    fields.phone = `Phone must be ${LIMITS.phone} characters or fewer.`;
  }

  if (company.length > LIMITS.company) {
    fields.company = `Company must be ${LIMITS.company} characters or fewer.`;
  }

  if (!message) {
    fields.message = "Message is required.";
  } else if (message.length > LIMITS.message) {
    fields.message = `Message must be ${LIMITS.message} characters or fewer.`;
  }

  if (Object.keys(fields).length > 0) {
    throw new ConsultationValidationError(fields);
  }

  return {
    name,
    email,
    phone,
    companyName: company.length > 0 ? company : null,
    message,
  };
}

export async function createConsultation(input: ConsultationInput): Promise<void> {
  await prisma.consultation.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      message: input.message,
    },
  });
}

export function publicConsultationError(error: unknown): string {
  if (error instanceof ConsultationValidationError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return "Consultation request could not be saved.";
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return "Consultation request could not be saved.";
  }

  return "Consultation request could not be saved.";
}

export function logConsultationError(error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected consultation error.";
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
}
