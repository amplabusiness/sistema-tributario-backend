import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<{
    datasources: {
        db: {
            url: any;
        };
    };
    log: ("query" | "warn" | "error")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const connectDatabase: () => Promise<void>;
export declare const disconnectDatabase: () => Promise<void>;
export default prisma;
//# sourceMappingURL=database.d.ts.map