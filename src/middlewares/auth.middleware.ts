import { Request, Response, NextFunction } from "express";
import { TokenService,httpStatus } from "../utils";
import { prisma } from "../db";
import { logger } from "../config";
import { ApiError } from "./apiError";
import { AuthenticatedRequest } from "../types";




export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Token required");
    }

    let payload: { id: string };

    try {
      payload = TokenService.verifyUserToken(accessToken) as { id: string };
      logger.info(`✅ Valid token for user ${payload.id}`);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Session Expired");
      } else {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token");
      }
    }

    // Ensure payload exists before proceeding
    if (!payload?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token payload");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
    });

    if (!customer) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User not found");
    }
    
    if(!customer.isActive){
      throw new ApiError(httpStatus.UNAUTHORIZED, "User account is deactivated. Please contact support.");
    }

    

    (req as AuthenticatedRequest).currentUser = {
          id: customer.id,
          email: customer.email,
          name: `${customer.firstName} ${customer.lastName}`,
        };

    next();
  } catch (error: any) {
    res.status(error.statusCode || 401).json({
      code: error.message === "Session Expired" ? "Session Expired" : "Unauthorized",
      message: error.message,
    });
  }
};