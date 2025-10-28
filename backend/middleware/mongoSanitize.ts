import type { Request, Response, NextFunction } from "express";

type PlainObject = Record<string, unknown>;

const sanitize = (obj: PlainObject, replaceWith = "_") => {
  if (typeof obj !== "object" || obj === null) return;

  for (const key of Object.keys(obj)) {
    const sanitizedKey = key.replace(/\$/g, replaceWith).replace(/\./g, replaceWith);

    if (sanitizedKey !== key) {
      (obj as Record<string, unknown>)[sanitizedKey] = (obj as Record<string, unknown>)[key];
      delete (obj as Record<string, unknown>)[key];
    }

    sanitize((obj as Record<string, unknown>)[sanitizedKey] as PlainObject, replaceWith);
  }
};

const mongoSanitize = (replaceWith = "_") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    ["body", "query", "params"].forEach((key) => {
      const value = (req as Record<string, unknown>)[key];
      sanitize(value as PlainObject, replaceWith);
    });

    next();
  };
};

export = mongoSanitize;
