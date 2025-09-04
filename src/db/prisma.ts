
import { PrismaClient } from "@prisma/client";
import { config } from '../config'


const prismaClientSingleton = ()=>{
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()
export { prisma };

if (config.env !== "production") globalThis.prismaGlobal = prisma;

