import express from "express";
const router = express.Router();

import { authRoutes } from "../core/auth";
import { customerRoutes } from "../core/customers";
import { transactionRoutes } from "../core/transactions";
const defaultRoutes: {
  path: string;
  route: any;
}[] = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/customers",
    route: customerRoutes,
  },
  {
    path: "/transaction",
    route: transactionRoutes,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export { router as customerRouter };
