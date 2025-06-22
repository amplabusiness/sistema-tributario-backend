"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_MESSAGES = exports.PROCESSING_STATUS = exports.DOCUMENT_STATUS = exports.DOCUMENT_TYPES = void 0;
exports.DOCUMENT_TYPES = {
    XML: 'XML',
    PDF: 'PDF',
    EXCEL: 'EXCEL',
    CSV: 'CSV',
    JSON: 'JSON',
};
exports.DOCUMENT_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    ERROR: 'ERROR',
};
exports.PROCESSING_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    ERROR: 'ERROR',
};
exports.UPLOAD_MESSAGES = {
    SUCCESS: 'Documento enviado com sucesso',
    UPLOAD_ERROR: 'Erro ao fazer upload do documento',
    INVALID_TYPE: 'Tipo de arquivo não permitido',
    NO_FILE: 'Nenhum arquivo enviado',
};
//# sourceMappingURL=document.js.map