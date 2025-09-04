import crypto from "crypto";

export function generateAccountNumber(): string {
  let accountNumber = "";
  while (accountNumber.length < 10) {
    accountNumber += crypto.randomInt(0, 10).toString();
  }
  return accountNumber;
}
