import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Choose color for status code
    let color = '\x1b[32m'; // Green for 2xx
    if (status >= 500) color = '\x1b[31m'; // Red for 5xx
    else if (status >= 400) color = '\x1b[33m'; // Yellow for 4xx
    else if (status >= 300) color = '\x1b[36m'; // Cyan for 3xx
    
    const reset = '\x1b[0m';
    
    console.log(
      `${req.method} ${req.originalUrl} ${color}${status}${reset} ${duration}ms`
    );
  });
  
  next();
};
