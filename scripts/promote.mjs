import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
console.log("PROMOTED", email);
await prisma.$disconnect();
