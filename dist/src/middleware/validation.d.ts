import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map