import { Request, Response } from "express";
import { prisma } from '../db';
import { PrismaClient } from "@prisma/client";



interface WithPaginationOptions<T> {
  model: keyof PrismaClient;
  req: Request;
  res: Response;
  where?: Record<string, any>;
  include?: Record<string, any>;
  transform?: (item: any) => T;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  defaultLimit?: number;
  additional?: Record<string, any>;
}

export async function withPagination<T>({
  model,
  req,
  where = {},
  include,
  transform = (item) => item,
  sortBy = "createdAt",
  sortOrder = "desc",
  defaultLimit = 20,
  additional = {},
}: WithPaginationOptions<T>) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || defaultLimit;
  const skip = (page - 1) * limit;

  const [totalItems, results] = await Promise.all([
    (prisma[model] as any).count({ where }),
    (prisma[model] as any).findMany({
      where,
      include,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  const hasMore = page * limit < totalItems;

  return {
    success: true,
    ...additional,
    results: await Promise.all(results.map(transform)),
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      limit,
      hasMore,
    },
  };
}