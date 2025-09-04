import { Request } from "express";


declare global {
  interface AuthUser {
    id: string;
    email: string;
    name: string;
  }


  namespace Express {
    interface Request {
      currentUser: AuthUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  currentUser: NonNullable<Express.Request["currentUser"]>;
}



declare module 'hpp';
declare module 'express-sslify';

export {};