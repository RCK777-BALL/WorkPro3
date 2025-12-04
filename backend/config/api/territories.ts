import { NextFunction, Request, Response, Router } from "express";

import {
  getLocalAll,
  getLocalAllRegion,
  getLocalTerritories,
  HelperLocalAll,
  HelperLocalAllRegion,
  HelperLocalTerritories,
} from "../../utils/territories/helper";
import type { LocalizedTerritory } from "../../utils/territories/helperTypes";
import { formatPrice, parsePrice } from "../../utils/prices";

const router = Router();

router.get(
  "/",
  (req: Request, res: Response<HelperLocalTerritories>, next: NextFunction) => {
    try {
      const locale = (req.query.locale as string) || undefined;
      const data = getLocalTerritories(locale);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/all",
  (req: Request, res: Response<HelperLocalAll>, next: NextFunction) => {
    try {
      const locale = (req.query.locale as string) || undefined;
      const data = getLocalAll(locale);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/regions",
  (req: Request, res: Response<HelperLocalAllRegion>, next: NextFunction) => {
    try {
      const locale = (req.query.locale as string) || undefined;
      const data = getLocalAllRegion(locale);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/format-price",
  (
    req: Request<unknown, unknown, { value: number; currency?: string; locale?: string }>,
    res: Response<{ formatted: string; territory?: LocalizedTerritory }>,
    next: NextFunction,
  ) => {
    try {
      const { value, currency, locale } = req.body;
      const formatted = formatPrice(value, { currency, locale });
      const territories = getLocalAll(locale);
      const territory = currency
        ? Object.values(territories).find((item) => item.currency === currency)
        : undefined;

      res.json({ formatted, territory });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/parse-price",
  (req: Request<unknown, unknown, { value: string }>, res: Response<{ value: number }>, next: NextFunction) => {
    try {
      const parsed = parsePrice(req.body.value);
      res.json({ value: parsed });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
