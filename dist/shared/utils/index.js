"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomId = exports.sanitizeString = exports.isValidFileSize = exports.isValidFileType = exports.createApiResponse = exports.createLogEntry = exports.generateCacheKey = exports.calculatePagination = exports.formatDate = exports.formatFileSize = exports.isValidPassword = exports.isValidEmail = void 0;
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidPassword = (password) => {
    return password.length >= 8;
};
exports.isValidPassword = isValidPassword;
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};
exports.formatDate = formatDate;
const calculatePagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    return {
        page,
        limit,
        total,
        totalPages,
        offset,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
};
exports.calculatePagination = calculatePagination;
const generateCacheKey = (prefix, ...parts) => {
    return `${prefix}:${parts.join(':')}`;
};
exports.generateCacheKey = generateCacheKey;
const createLogEntry = (level, message, metadata) => {
    return {
        level,
        message,
        timestamp: new Date(),
        metadata,
    };
};
exports.createLogEntry = createLogEntry;
const createApiResponse = (success, data, error, message) => {
    return {
        success,
        data,
        error,
        message,
        timestamp: new Date(),
    };
};
exports.createApiResponse = createApiResponse;
const isValidFileType = (mimeType) => {
    const allowedTypes = [
        'application/pdf',
        'application/xml',
        'text/xml',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ];
    return allowedTypes.includes(mimeType);
};
exports.isValidFileType = isValidFileType;
const isValidFileSize = (size, maxSize) => {
    return size <= maxSize;
};
exports.isValidFileSize = isValidFileSize;
const sanitizeString = (str) => {
    return str.trim().replace(/\s+/g, ' ');
};
exports.sanitizeString = sanitizeString;
const generateRandomId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
exports.generateRandomId = generateRandomId;
//# sourceMappingURL=index.js.map