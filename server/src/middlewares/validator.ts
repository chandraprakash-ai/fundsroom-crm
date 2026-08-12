import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validates body, query parameters, and URL parameters all at once
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next(); // Everything matches! Go to the controller.
    } catch (error) {
            if (error instanceof ZodError) {
        // If validation fails, return a clean 400 Bad Request response
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.issues.map(err => ({
            field: err.path.join('.').replace(/^(body|query|params)\./, ''),
            message: err.message
          }))
        });
        return;
      }
      
      next(error); // Pass any other unexpected errors to global handler
    }
  };
};
