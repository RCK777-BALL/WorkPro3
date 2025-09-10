import express from 'express';
import rateLimit from 'express-rate-limit';
import RequestForm from '../models/RequestForm';

const router = express.Router();

const submissionLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

async function verifyCaptcha(token: string): Promise<boolean> {
  // Placeholder verification for tests
  return token === 'valid-captcha';
}

router.get('/:slug', async (req, res, next) => {
  try {
    const form = await RequestForm.findOne({ slug: req.params.slug }).lean();
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form.schema);
  } catch (err) {
    next(err);
  }
});

router.post('/:slug', submissionLimiter, async (req, res, next) => {
  try {
    const { captcha } = req.body;
    if (!(await verifyCaptcha(captcha))) {
      return res.status(400).json({ message: 'Invalid CAPTCHA' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
