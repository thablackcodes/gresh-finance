import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export class HashService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async hashPin(transactionPin: string): Promise<string> {
    return bcrypt.hash(transactionPin, SALT_ROUNDS);
  }

  static async comparePin(transactionPin: string, hashedPin: string): Promise<boolean> {
    return bcrypt.compare(transactionPin, hashedPin);
  }
}