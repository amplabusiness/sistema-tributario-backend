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
        documentos: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            userId: string;
            filename: string;
            originalName: string;
            path: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            empresaId: string | null;
        }[];
    } & {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        updatedAt: Date;
    }>;
    static getEmpresaByCnpj(cnpj: string): Promise<({
        documentos: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            userId: string;
            filename: string;
            originalName: string;
            path: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            empresaId: string | null;
        }[];
    } & {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        updatedAt: Date;
    }) | null>;
    static listEmpresas(): Promise<{
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        _count: {
            documentos: number;
        };
    }[]>;
    static getEmpresasByPeriod(ano: number, mes?: number): Promise<({
        documentos: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            userId: string;
            filename: string;
            originalName: string;
            path: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            empresaId: string | null;
        }[];
    } & {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        updatedAt: Date;
    })[]>;
    static extractEmpresaFromFile(filePath: string, fileContent: string): Promise<EmpresaData | null>;
    static associateDocumentWithEmpresa(documentId: string, empresaId: string): Promise<{
        id: string;
        updatedAt: Date;
        createdAt: Date;
        userId: string;
        filename: string;
        originalName: string;
        path: string;
        size: number;
        mimeType: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        empresaId: string | null;
    }>;
    static getEmpresaStats(): Promise<{
        totalEmpresas: number;
        totalDocumentos: number;
        empresasPorRegime: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.EmpresaGroupByOutputType, "regimeTributario"[]> & {
            _count: {
                id: number;
            };
        })[];
    }>;
    static listarEmpresas(): Promise<{
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        _count: {
            documentos: number;
        };
    }[]>;
    static buscarEmpresa(empresaId: string): Promise<({
        documentos: {
            id: string;
            createdAt: Date;
            filename: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
        }[];
    } & {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        updatedAt: Date;
    }) | null>;
    static findByCnpj(cnpj: string): Promise<({
        documentos: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            userId: string;
            filename: string;
            originalName: string;
            path: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            empresaId: string | null;
        }[];
    } & {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        updatedAt: Date;
    }) | null>;
    static createEmpresa(data: EmpresaData): Promise<{
        documentos: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            userId: string;
            filename: string;
            originalName: string;
            path: string;
            size: number;
            mimeType: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            empresaId: string | null;
        }[];
    } & {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        ie: string | null;
        im: string | null;
        cnae: string | null;
        endereco: string | null;
        regimeTributario: string | null;
        dataCadastro: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=empresa-service.d.ts.map