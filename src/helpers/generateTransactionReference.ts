
export function generateTransactionReference(prefix = "TRF"): string { 
  const randomPart = Math.random().toString(36).substring(2, 11); 
  const timestamp = Date.now();
  const reference = `${prefix}|${timestamp}|${randomPart}`;
  return reference;
}
