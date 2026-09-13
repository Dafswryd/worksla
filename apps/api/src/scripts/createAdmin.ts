import { createInterface } from 'node:readline/promises'
import { prisma } from '../db/client'
import { createUser } from '../modules/users/service'

/** For a real pilot the first admin must not be a seeded account. */
async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const email = await rl.question('Email: ')
  const name = await rl.question('Nama lengkap: ')
  const password = await rl.question('Kata sandi (min 12 karakter): ')
  rl.close()

  if (password.length < 12) throw new Error('Kata sandi terlalu pendek')

  const role = await createUser({
    email: email.trim(),
    password,
    name: name.trim(),
    type: 'admin',
    position: 'Super Admin',
    initials: name
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  })

  console.log(`Admin dibuat: ${role.name} <${email}>`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    await prisma.$disconnect()
    process.exit(1)
  })
