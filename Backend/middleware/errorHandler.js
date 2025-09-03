import logger from '../utils/logger';
const errorHandler = (err, _req, res, _next) => {
    logger.error(err);
    const status = err.status ||
        (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
    res.status(status).json({ message: err.message || 'Internal Server Error' });
};
export default errorHandler;
