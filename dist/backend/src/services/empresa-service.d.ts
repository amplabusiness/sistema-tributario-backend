export interface EmpresaData {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    ie?: string;
    im?: string;
    cnae?: string;
    endereco?: string;
    regimeTributario?: string;
}
export interface EmpresaWithPeriod {
    empresa: EmpresaData;
    ano: number;
    mes?: number;
}
export declare class EmpresaService {
    static createOrUpdateEmpresa(data: EmpresaData): Promise<{
        id: string;
        updatedAt: Date;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
    }>;
    static getEmpresaByCnpj(cnpj: string): Promise<{
        documentos: {
            empresaId: string | null;
            id: string;
            filename: string;
            originalName: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            userId: string;
            path: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
    }>;
    static listEmpresas(): Promise<{
        id: string;
        _count: {
            documentos: number;
        };
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string;
        regimeTributario: string;
        dataCadastro: Date;
    }[]>;
    static getEmpresasByPeriod(ano: number, mes?: number): Promise<({
        documentos: {
            empresaId: string | null;
            id: string;
            filename: string;
            originalName: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            userId: string;
            path: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
    })[]>;
    static extractEmpresaFromFile(filePath: string, fileContent: string): Promise<EmpresaData | null>;
    static associateDocumentWithEmpresa(documentId: string, empresaId: string): Promise<{
        empresaId: string | null;
        id: string;
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        userId: string;
        path: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static getEmpresaStats(): Promise<{
        totalEmpresas: any;
        totalDocumentos: any;
        empresasPorRegime: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.EmpresaGroupByOutputType, "regimeTributario"[]> & {
            _count: {
                id: number;
            };
        })[];
    }>;
}
//# sourceMappingURL=empresa-service.d.ts.map