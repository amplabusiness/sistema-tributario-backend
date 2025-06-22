"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParser = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const sped_fiscal_parser_1 = require("./sped-fiscal-parser");
const sped_contribuicoes_parser_1 = require("./sped-contribuicoes-parser");
const icms_rules_excel_parser_1 = require("./icms-rules-excel-parser");
const protege_pdf_parser_1 = require("./protege-pdf-parser");
class DocumentParser {
    constructor() {
        this.spedFiscalParser = new sped_fiscal_parser_1.SpedFiscalParser();
        this.spedContribuicoesParser = new sped_contribuicoes_parser_1.SpedContribuicoesParser();
        this.icmsRulesParser = new icms_rules_excel_parser_1.IcmsRulesExcelParser();
        this.protegeParser = new protege_pdf_parser_1.ProtegePdfParser();
    }
    async parseDocument(filePath) {
        const startTime = Date.now();
        const fileName = filePath.split('/').pop() || filePath;
        const fileExtension = (0, path_1.extname)(fileName).toLowerCase();
        console.log(`Iniciando parsing do documento: ${fileName}`, { filePath, fileType: fileExtension });
        try {
            const fileBuffer = (0, fs_1.readFileSync)(filePath);
            const fileSize = fileBuffer.length;
            const checksum = this.calculateChecksum(fileBuffer);
            let parsedData = {};
            let companyData = {};
            let fiscalData = { produtos: [], operacoes: [], impostos: [] };
            switch (fileExtension) {
                case '.txt':
                    if (fileName.includes('SPED') || fileName.includes('sped')) {
                        const content = fileBuffer.toString('utf-8');
                        if (content.includes('|0000|') && content.includes('|C100|')) {
                            parsedData = sped_fiscal_parser_1.SpedFiscalParser.parseContent(content);
                            companyData = this.extractCompanyDataFromSped(parsedData);
                            fiscalData = this.extractFiscalDataFromSped(parsedData);
                        }
                        else if (content.includes('|0000|') && content.includes('|M100|')) {
                            parsedData = sped_contribuicoes_parser_1.SpedContribuicoesParser.parseContent(content);
                            companyData = this.extractCompanyDataFromSped(parsedData);
                            fiscalData = this.extractFiscalDataFromSpedContribuicoes(parsedData);
                        }
                    }
                    break;
                case '.xlsx':
                case '.xls':
                    if (fileName.toLowerCase().includes('icms') || fileName.toLowerCase().includes('regras')) {
                        const tempPath = `/tmp/${fileName}`;
                        require('fs').writeFileSync(tempPath, fileBuffer);
                        parsedData = icms_rules_excel_parser_1.IcmsRulesExcelParser.parseFile(tempPath);
                        companyData = this.extractCompanyDataFromExcel(parsedData);
                    }
                    break;
                case '.pdf':
                    if (fileName.toLowerCase().includes('protege')) {
                        const tempPath = `/tmp/${fileName}`;
                        require('fs').writeFileSync(tempPath, fileBuffer);
                        parsedData = protege_pdf_parser_1.ProtegePdfParser.parseProtegeGoias(tempPath);
                        companyData = this.extractCompanyDataFromPdf(parsedData);
                    }
                    break;
                default:
                    throw new Error(`Tipo de arquivo não suportado: ${fileExtension}`);
            }
            const validationResults = this.validateDocument(companyData, fiscalData);
            const metadata = {
                fileSize,
                checksum,
                processingTime: Date.now() - startTime,
                parserVersion: '1.0.0'
            };
            const result = {
                id: this.generateDocumentId(fileName),
                fileName,
                fileType: fileExtension,
                companyData,
                fiscalData,
                validationResults,
                metadata,
                extractedAt: new Date()
            };
            console.log(`Documento parseado com sucesso: ${fileName}`, {
                companyData: result.companyData.cnpj,
                validationResults: result.validationResults.length,
                processingTime: metadata.processingTime
            });
            return result;
        }
        catch (error) {
            console.error(`Erro ao fazer parsing do documento: ${fileName}`, { error, filePath });
            throw error;
        }
    }
    extractCompanyDataFromSped(spedData) {
        const bloco0 = spedData.blocos?.bloco0;
        if (!bloco0)
            return {};
        const registro0000 = bloco0.registros?.find((r) => r.registro === '0000');
        const registro0005 = bloco0.registros?.find((r) => r.registro === '0005');
        return {
            cnpj: registro0000?.cnpj,
            razaoSocial: registro0000?.nome,
            ie: registro0000?.ie,
            im: registro0000?.im,
            cnae: registro0000?.cnae,
            endereco: registro0005 ? {
                logradouro: registro0005.logradouro,
                numero: registro0005.numero,
                complemento: registro0005.complemento,
                bairro: registro0005.bairro,
                municipio: registro0005.municipio,
                uf: registro0005.uf,
                cep: registro0005.cep
            } : undefined,
            regimeTributario: registro0000?.indPerfil,
            dataInicioAtividade: registro0000?.dtIni ? new Date(registro0000.dtIni) : undefined,
            dataFimAtividade: registro0000?.dtFin ? new Date(registro0000.dtFin) : undefined
        };
    }
    extractFiscalDataFromSped(spedData) {
        const blocoC = spedData.blocos?.blocoC;
        const blocoD = spedData.blocos?.blocoD;
        const produtos = [];
        const operacoes = [];
        const impostos = [];
        if (blocoC?.registros) {
            blocoC.registros.forEach((registro) => {
                if (registro.registro === '170') {
                    produtos.push({
                        codigo: registro.codItem,
                        descricao: registro.descrCompl,
                        ncm: registro.ncm,
                        cest: registro.cest,
                        unidade: registro.unid,
                        quantidade: parseFloat(registro.qtd) || 0,
                        valorUnitario: parseFloat(registro.vlItem) || 0,
                        valorTotal: parseFloat(registro.vlItem) || 0
                    });
                }
                if (registro.registro === '190') {
                    operacoes.push({
                        tipo: 'saida',
                        cfop: registro.cfop,
                        cst: registro.cstIcms,
                        naturezaOperacao: registro.natBcCred,
                        valorOperacao: parseFloat(registro.vlBcIcms) || 0,
                        baseCalculo: parseFloat(registro.vlBcIcms) || 0,
                        aliquota: parseFloat(registro.aliqIcms) || 0,
                        valorImposto: parseFloat(registro.vlIcms) || 0,
                        data: new Date()
                    });
                }
            });
        }
        if (blocoC?.registros) {
            blocoC.registros.forEach((registro) => {
                if (registro.registro === '190') {
                    if (parseFloat(registro.vlIcms) > 0) {
                        impostos.push({
                            tipo: 'ICMS',
                            baseCalculo: parseFloat(registro.vlBcIcms) || 0,
                            aliquota: parseFloat(registro.aliqIcms) || 0,
                            valor: parseFloat(registro.vlIcms) || 0,
                            periodo: new Date()
                        });
                    }
                }
            });
        }
        return {
            produtos,
            operacoes,
            impostos,
            totalFaturamento: operacoes.reduce((sum, op) => sum + op.valorOperacao, 0)
        };
    }
    extractFiscalDataFromSpedContribuicoes(spedData) {
        const blocoM = spedData.blocos?.blocoM;
        const produtos = [];
        const operacoes = [];
        const impostos = [];
        if (blocoM?.registros) {
            blocoM.registros.forEach((registro) => {
                if (registro.registro === '100') {
                    operacoes.push({
                        tipo: 'saida',
                        cfop: registro.cfop,
                        cst: registro.cstPis,
                        valorOperacao: parseFloat(registro.vlItem) || 0,
                        baseCalculo: parseFloat(registro.vlBcPis) || 0,
                        aliquota: parseFloat(registro.aliqPis) || 0,
                        valorImposto: parseFloat(registro.vlPis) || 0,
                        data: new Date()
                    });
                    if (parseFloat(registro.vlPis) > 0) {
                        impostos.push({
                            tipo: 'PIS',
                            baseCalculo: parseFloat(registro.vlBcPis) || 0,
                            aliquota: parseFloat(registro.aliqPis) || 0,
                            valor: parseFloat(registro.vlPis) || 0,
                            periodo: new Date()
                        });
                    }
                    if (parseFloat(registro.vlCofins) > 0) {
                        impostos.push({
                            tipo: 'COFINS',
                            baseCalculo: parseFloat(registro.vlBcCofins) || 0,
                            aliquota: parseFloat(registro.aliqCofins) || 0,
                            valor: parseFloat(registro.vlCofins) || 0,
                            periodo: new Date()
                        });
                    }
                }
            });
        }
        return {
            produtos,
            operacoes,
            impostos,
            totalFaturamento: operacoes.reduce((sum, op) => sum + op.valorOperacao, 0)
        };
    }
    extractCompanyDataFromExcel(excelData) {
        return {
            razaoSocial: excelData.empresa?.nome,
            cnpj: excelData.empresa?.cnpj,
            ie: excelData.empresa?.ie
        };
    }
    extractCompanyDataFromPdf(pdfData) {
        return {
            razaoSocial: pdfData.empresa?.nome,
            cnpj: pdfData.empresa?.cnpj,
            ie: pdfData.empresa?.ie
        };
    }
    validateDocument(companyData, fiscalData) {
        const results = [];
        if (companyData.cnpj) {
            const isValidCnpj = this.validateCnpj(companyData.cnpj);
            results.push({
                field: 'cnpj',
                isValid: isValidCnpj,
                message: isValidCnpj ? 'CNPJ válido' : 'CNPJ inválido',
                severity: isValidCnpj ? 'info' : 'error'
            });
        }
        if (companyData.ie) {
            const isValidIe = this.validateIe(companyData.ie);
            results.push({
                field: 'ie',
                isValid: isValidIe,
                message: isValidIe ? 'IE válida' : 'IE inválida',
                severity: isValidIe ? 'info' : 'warning'
            });
        }
        fiscalData.operacoes.forEach((op, index) => {
            const isValidCfop = this.validateCfop(op.cfop);
            results.push({
                field: `cfop_${index}`,
                isValid: isValidCfop,
                message: isValidCfop ? `CFOP ${op.cfop} válido` : `CFOP ${op.cfop} inválido`,
                severity: isValidCfop ? 'info' : 'error'
            });
        });
        fiscalData.operacoes.forEach((op, index) => {
            const isValidCst = this.validateCst(op.cst);
            results.push({
                field: `cst_${index}`,
                isValid: isValidCst,
                message: isValidCst ? `CST ${op.cst} válido` : `CST ${op.cst} inválido`,
                severity: isValidCst ? 'info' : 'error'
            });
        });
        fiscalData.produtos.forEach((prod, index) => {
            if (prod.ncm) {
                const isValidNcm = this.validateNcm(prod.ncm);
                results.push({
                    field: `ncm_${index}`,
                    isValid: isValidNcm,
                    message: isValidNcm ? `NCM ${prod.ncm} válido` : `NCM ${prod.ncm} inválido`,
                    severity: isValidNcm ? 'info' : 'warning'
                });
            }
        });
        return results;
    }
    validateCnpj(cnpj) {
        const cleanCnpj = cnpj.replace(/[^\d]/g, '');
        if (cleanCnpj.length !== 14)
            return false;
        if (/^(\d)\1+$/.test(cleanCnpj))
            return false;
        let sum = 0;
        let weight = 2;
        for (let i = 11; i >= 0; i--) {
            sum += parseInt(cleanCnpj[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        const remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;
        if (parseInt(cleanCnpj[12]) !== digit1)
            return false;
        sum = 0;
        weight = 2;
        for (let i = 12; i >= 0; i--) {
            sum += parseInt(cleanCnpj[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        const remainder2 = sum % 11;
        const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
        return parseInt(cleanCnpj[13]) === digit2;
    }
    validateIe(ie) {
        const cleanIe = ie.replace(/[^\d]/g, '');
        return cleanIe.length >= 8 && cleanIe.length <= 12;
    }
    validateCfop(cfop) {
        return /^\d{4}$/.test(cfop);
    }
    validateCst(cst) {
        return /^\d{2,3}$/.test(cst);
    }
    validateNcm(ncm) {
        return /^\d{8}$/.test(ncm);
    }
    calculateChecksum(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
    generateDocumentId(fileName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${fileName.replace(/[^a-zA-Z0-9]/g, '')}_${timestamp}_${random}`;
    }
}
exports.DocumentParser = DocumentParser;
//# sourceMappingURL=document-parser.js.map