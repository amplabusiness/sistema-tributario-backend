import { Request } from 'express';
export type UserRole = 'ADMIN' | 'USER' | 'AUDITOR';
export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    empresaId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}
//# sourceMappingURL=auth.d.ts.map