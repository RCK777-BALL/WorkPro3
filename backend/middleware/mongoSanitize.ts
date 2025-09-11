import type { Request, Response, NextFunction } from "express";

const sanitize = (obj: Record<string, any>, replaceWith = "_") => {
  if (typeof obj !== "object" || obj === null) return;
  for (const key of Object.keys(obj)) {
    const sanitizedKey = key.replace(/\$/g, replaceWith).replace(/\./g, replaceWith);
    if (sanitizedKey !== key) {
      obj[sanitizedKey] = obj[key];
      delete obj[key];
    }
    sanitize(obj[sanitizedKey], replaceWith);
  }
};

const mongoSanitize = (replaceWith = "_") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    ["body", "query", "params"].forEach((key) => {
      // @ts-expect-error dynamic access
      sanitize(req[key], replaceWith);
    });
    next();
  };
};

export default mongoSanitize;
