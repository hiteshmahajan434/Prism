import { prisma } from "../lib/prisma.js";

export async function syncUser({ userId, email }) {
  if (!userId) {
    throw new Error("Clerk user ID is required");
  }

  return prisma.user.upsert({
    where: {
      id: userId,
    },
    update: {
      ...(email ? { email } : {}),
    },
    create: {
      id: userId,
      email: email || null,
    },
  });
}