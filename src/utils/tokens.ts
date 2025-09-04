import jwt from "jsonwebtoken";
import { config } from "../config";

type TokenType = "user";

export class TokenService {
  static generateUserToken(payload: AuthUser): string {
    return jwt.sign({ payload, type: "user" }, config.JWT_ACCESS_SECRET, {
      expiresIn: `${config.ACCESS_TOKEN_EXPIRES_DAYS}h`,
      algorithm: "HS256",
    });
  }

  static verifyUserToken(token: string): AuthUser {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
      payload: AuthUser;
      type: TokenType;
    };

    if (decoded.type !== "user") {
      throw new Error("Invalid token type - expected user token");
    }

    return decoded.payload;
  }

  static generateUserRefreshToken(payload: AuthUser): string {
    return jwt.sign({ payload, type: "user" }, config.JWT_REFRESH_SECRET, {
      expiresIn: `${config.REFRESH_TOKEN_EXPIRES_DAYS}h`,
    });
  }
}
