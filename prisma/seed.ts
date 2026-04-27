import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const username = process.env.ADMIN_USER
  const password = process.env.ADMIN_PASS

  if (!username || !password) {
    throw new Error('ADMIN_USER and ADMIN_PASS must be set in environment variables')
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`✓ Admin user "${username}" already exists — skipping`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: { username, passwordHash, role: 'ADMIN' },
  })

  console.log(`✓ Admin user "${username}" created successfully`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())