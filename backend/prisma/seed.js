import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  let branch = await prisma.branch.findFirst({
    where: { branch_name: "Main Branch" },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        branch_name: "Main Branch",
        address: "Default HQ",
      },
    });
  }

  let branch2 = await prisma.branch.findFirst({
    where: { branch_name: "North Service Center" },
  });
  if (!branch2) {
    branch2 = await prisma.branch.create({
      data: {
        branch_name: "North Service Center",
        address: "Secondary site",
      },
    });
  }

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { branch_id: branch.id, password: passwordHash, role: "admin" },
    create: {
      branch_id: branch.id,
      username: "admin",
      password: passwordHash,
      role: "admin",
    },
  });

  const hqHash = await bcrypt.hash("hq123", 10);
  await prisma.user.upsert({
    where: { username: "hq" },
    update: { branch_id: branch.id, password: hqHash, role: "hq" },
    create: {
      branch_id: branch.id,
      username: "hq",
      password: hqHash,
      role: "hq",
    },
  });

  console.log(
    "Seed OK: Main Branch + North Service Center, admin/admin123, hq/hq123"
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
