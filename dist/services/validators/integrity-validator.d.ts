export interface IntegrityResult {
    isValid: boolean;
    checksum: string;
    errors: string[];
    warnings: string[];
    metadata: {
        size: number;
        lastModified: Date;
        fileType: string;
        encoding?: string;
    };
}
export declare class IntegrityValidator {
    private readonly ALGORITHM;
    private readonly BUFFER_SIZE;
    private readonly VALIDATIONS;
    validateFile(filePath: string): Promise<IntegrityResult>;
    private validateBasicFile;
    private calculateChecksum;
    private validateFileType;
    private validateXML;
    private validateSPED;
    private validatePDF;
    private validateExcel;
    private validateFiscalContent;
    private validateStructure;
    private validateXMLStructure;
    private validateSPEDStructure;
    private readFileHeader;
    private readFileContent;
}
//# sourceMappingURL=integrity-validator.d.ts.map