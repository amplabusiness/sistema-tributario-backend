export type DocumentType = 'XML' | 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
export interface DocumentMetadata {
    uploadedAt: string;
    uploadedBy: string;
    documentType: DocumentType;
    description?: string;
}
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
export type AllowedMimeType = 'application/pdf' | 'application/xml' | 'text/xml' | 'application/json' | 'text/csv' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'application/vnd.ms-excel';
export interface DocumentJob {
    documentId: string;
    userId: string;
    type: DocumentType;
}
export interface AIDocumentJob {
    documentId: string;
    content: string;
    model: 'document-parser';
}
//# sourceMappingURL=document.d.ts.map