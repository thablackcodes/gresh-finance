export function generateTransferReference(prefix = "Trx"): string { 
  const randomPart = Math.random().toString(36).substring(2, 18); 
  const timestamp = Date.now();
  const reference = `${prefix}|${timestamp}|${randomPart}`;
  return reference;
}