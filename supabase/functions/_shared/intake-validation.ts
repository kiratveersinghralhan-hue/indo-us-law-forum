export const intakeLimit = 5 * 1024 * 1024;
export type IntakeFields = {
  requestId: string;
  title: string;
  excerpt: string;
  author: string;
  email: string;
  categoryId: string;
  outline: string;
  token: string;
  website: string;
  elapsed: string;
};
export function validateIntake(input: IntakeFields) {
  const required: [keyof IntakeFields, number][] = [
    ["title", 180],
    ["excerpt", 1200],
    ["author", 120],
    ["email", 254],
    ["outline", 6000],
    ["token", 2048],
  ];
  for (const [key, max] of required) {
    if (
      typeof input[key] !== "string" || !input[key].trim() ||
      input[key].length > max
    ) throw Error(`Invalid ${key}.`);
  }
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.requestId) || !uuid.test(input.categoryId)) {
    throw Error("Invalid record reference.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw Error("Invalid email.");
  }
  if (
    input.website || !Number.isFinite(Number(input.elapsed)) ||
    Number(input.elapsed) < 3000
  ) throw Error("Submission could not be accepted.");
  return {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    author: input.author.trim(),
    body: [{ type: "paragraph", text: input.outline.trim() }],
    fictional: false,
  };
}
export function validateAttachment(bytes: Uint8Array, type: string) {
  if (
    !bytes.length || bytes.length > intakeLimit || type !== "application/pdf" ||
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  ) throw Error("Attachment must be a PDF up to 5 MB.");
}
