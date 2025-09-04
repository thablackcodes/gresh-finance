import { Request, Response, NextFunction } from "express";
import sanitizeHtml from "sanitize-html";


function deepSanitize(data: any): any {
  if (typeof data === "string") {
    return sanitizeHtml(data, {
          allowedTags: [], 
          allowedAttributes: {},
          disallowedTagsMode: 'discard', 
          allowVulnerableTags: false,  
          textFilter: (text) => text.replace(/javascript:/gi, ''),
        });
  }
  if (Array.isArray(data)) {
    return data.map(deepSanitize);
  }
  if (typeof data === "object" && data !== null) {
    const sanitizedObj: Record<string, any> = {};
    for (const key in data) {
      sanitizedObj[key] = deepSanitize(data[key]); 
    }
    return sanitizedObj;
  }
  return data; 
}


export const sanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) {
    const sanitizedQuery = deepSanitize(req.query);
    Object.keys(sanitizedQuery).forEach(key => {
      (req.query as any)[key] = sanitizedQuery[key];
    });
  }
  if (req.params) {
    const sanitizedParams = deepSanitize(req.params);
    Object.keys(sanitizedParams).forEach(key => {
      (req.params as any)[key] = sanitizedParams[key];
    });
  }
  
  next();
};