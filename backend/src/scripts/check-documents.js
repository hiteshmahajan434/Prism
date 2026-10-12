import { prisma } from "../lib/prisma.js";

async function main() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      filename: true,
      mimeType: true,
      fileSize: true,
      status: true,
      createdAt: true,
    },
  });

  console.table(documents);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });