import { ValidatorConfig } from '../../types/watcher';
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        size: number;
        extension: string;
        hash?: string;
        checksum?: string;
        signature?: string;
    };
}
export declare class IntegrityValidator {
    private config;
    constructor(config: ValidatorConfig);
    validateFile(filePath: string): Promise<ValidationResult>;
    private calculateHash;
    private calculateChecksum;
    private validateSignature;
}
//# sourceMappingURL=integrity-validator.d.ts.map