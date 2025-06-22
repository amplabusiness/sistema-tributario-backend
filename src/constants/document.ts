export const DOCUMENT_TYPES = {
  XML: 'XML',
  PDF: 'PDF',
  EXCEL: 'EXCEL',
  CSV: 'CSV',
  JSON: 'JSON',
} as const;

export const DOCUMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
} as const;

export const PROCESSING_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
} as const;

export const UPLOAD_MESSAGES = {
  SUCCESS: 'Documento enviado com sucesso',
  UPLOAD_ERROR: 'Erro ao fazer upload do documento',
  INVALID_TYPE: 'Tipo de arquivo não permitido',
  NO_FILE: 'Nenhum arquivo enviado',
} as const;
