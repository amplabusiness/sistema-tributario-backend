"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
    UserRole["AUDITOR"] = "auditor";
})(UserRole || (exports.UserRole = UserRole = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "pending";
    DocumentStatus["PROCESSING"] = "processing";
    DocumentStatus["COMPLETED"] = "completed";
    DocumentStatus["ERROR"] = "error";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
//# sourceMappingURL=index.js.map