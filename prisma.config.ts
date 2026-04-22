import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  datasource: {
    db: {
      url: process.env.DIRECT_URL!,         // для міграцій
    },
  },
})