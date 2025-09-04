import { Decimal } from "@prisma/client/runtime/library";

export const toMoney = (value: Decimal | number | string) => {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value);
};




export function removeNullsDeep(obj: any, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) return undefined;

  
  if (typeof obj !== "object" || obj instanceof Date) {
    return obj instanceof Date ? obj.toISOString() : obj;
  }

  
  if (seen.has(obj)) return undefined;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeNullsDeep(item, seen))
      .filter((item) => item !== null && item !== undefined);
  }

  if (typeof obj.toNumber === "function") {
    return obj.toNumber();
  }

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, removeNullsDeep(value, seen)])
  );
}
