"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xml_parser_1 = require("../../../src/services/parsers/xml-parser");
describe('XML Parser', () => {
    let xmlParser;
    beforeEach(() => {
        xmlParser = new xml_parser_1.XMLParser();
    });
    describe('Parse NFe', () => {
        it('deve fazer parsing de NFe válida', async () => {
            const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <NFe>
            <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
              <ide>
                <nNF>123456</nNF>
                <serie>1</serie>
                <dhEmi>2024-01-15T14:30:45-03:00</dhEmi>
              </ide>
              <emit>
                <CNPJ>12345678000195</CNPJ>
              </emit>
              <dest>
                <CNPJ>98765432000187</CNPJ>
              </dest>
              <det nItem="1">
                <prod>
                  <cProd>001</cProd>
                  <xProd>Produto Teste</xProd>
                  <NCM>12345678</NCM>
                  <CFOP>5102</CFOP>
                  <qCom>10.0000</qCom>
                  <vUnCom>100.00</vUnCom>
                  <vProd>1000.00</vProd>
                </prod>
                <imposto>
                  <ICMS>
                    <ICMS00>
                      <CST>00</CST>
                      <pICMS>18.00</pICMS>
                      <vICMS>180.00</vICMS>
                    </ICMS00>
                  </ICMS>
                  <PIS>
                    <CST>01</CST>
                    <pPIS>1.65</pPIS>
                    <vPIS>16.50</vPIS>
                  </PIS>
                  <COFINS>
                    <CST>01</CST>
                    <pCOFINS>7.6</pCOFINS>
                    <vCOFINS>76.00</vCOFINS>
                  </COFINS>
                </imposto>
              </det>
              <total>
                <ICMSTot>
                  <vBC>1000.00</vBC>
                  <vICMS>180.00</vICMS>
                  <vNF>1000.00</vNF>
                </ICMSTot>
                <PIS>
                  <vBC>1000.00</vBC>
                  <vPIS>16.50</vPIS>
                </PIS>
                <COFINS>
                  <vBC>1000.00</vBC>
                  <vCOFINS>76.00</vCOFINS>
                </COFINS>
              </total>
            </infNFe>
          </NFe>
          <protNFe>
            <infProt>
              <cStat>100</cStat>
            </infProt>
          </protNFe>
        </nfeProc>
      `;
            const resultado = await xmlParser.parseXML(xmlContent, 'NFe');
            expect(resultado.tipoDocumento).toBe('NFe');
            expect(resultado.numeroDocumento).toBe('123456');
            expect(resultado.serie).toBe('1');
            expect(resultado.cnpjEmitente).toBe('12345678000195');
            expect(resultado.cnpjDestinatario).toBe('98765432000187');
            expect(resultado.valorTotal).toBe(1000.00);
            expect(resultado.status).toBe('autorizada');
            expect(resultado.itens).toHaveLength(1);
            expect(resultado.itens[0].codigo).toBe('001');
            expect(resultado.itens[0].descricao).toBe('Produto Teste');
            expect(resultado.itens[0].ncm).toBe('12345678');
            expect(resultado.itens[0].cfop).toBe('5102');
            expect(resultado.itens[0].cst).toBe('00');
            expect(resultado.impostos.valorTotalIcms).toBe(180.00);
            expect(resultado.impostos.valorTotalPis).toBe(16.50);
            expect(resultado.impostos.valorTotalCofins).toBe(76.00);
        });
        it('deve lidar com NFe cancelada', async () => {
            const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <NFe>
            <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
              <ide>
                <nNF>123456</nNF>
                <serie>1</serie>
                <dhEmi>2024-01-15T14:30:45-03:00</dhEmi>
              </ide>
              <emit>
                <CNPJ>12345678000195</CNPJ>
              </emit>
              <total>
                <ICMSTot>
                  <vNF>1000.00</vNF>
                </ICMSTot>
              </total>
            </infNFe>
          </NFe>
          <protNFe>
            <infProt>
              <cStat>101</cStat>
            </infProt>
          </protNFe>
        </nfeProc>
      `;
            const resultado = await xmlParser.parseXML(xmlContent, 'NFe');
            expect(resultado.status).toBe('cancelada');
        });
        it('deve lidar com NFe denegada', async () => {
            const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <NFe>
            <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
              <ide>
                <nNF>123456</nNF>
                <serie>1</serie>
                <dhEmi>2024-01-15T14:30:45-03:00</dhEmi>
              </ide>
              <emit>
                <CNPJ>12345678000195</CNPJ>
              </emit>
              <total>
                <ICMSTot>
                  <vNF>1000.00</vNF>
                </ICMSTot>
              </total>
            </infNFe>
          </NFe>
          <protNFe>
            <infProt>
              <cStat>110</cStat>
            </infProt>
          </protNFe>
        </nfeProc>
      `;
            const resultado = await xmlParser.parseXML(xmlContent, 'NFe');
            expect(resultado.status).toBe('denegada');
        });
    });
    describe('Parse CTe', () => {
        it('deve fazer parsing de CTe válido', async () => {
            const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
          <CTe>
            <infCte Id="CTe12345678901234567890123456789012345678901234" versao="3.00">
              <ide>
                <cCT>123456</cCT>
                <serie>1</serie>
                <dhEmi>2024-01-15T14:30:45-03:00</dhEmi>
              </ide>
              <emit>
                <CNPJ>12345678000195</CNPJ>
              </emit>
              <rem>
                <CNPJ>98765432000187</CNPJ>
              </rem>
              <dest>
                <CNPJ>11111111000199</CNPJ>
              </dest>
              <vPrest>
                <vTPrest>500.00</vTPrest>
              </vPrest>
            </infCte>
          </CTe>
          <protCTe>
            <infProt>
              <cStat>100</cStat>
            </infProt>
          </protCTe>
        </cteProc>
      `;
            const resultado = await xmlParser.parseXML(xmlContent, 'CTe');
            expect(resultado.tipoDocumento).toBe('CTe');
            expect(resultado.numeroDocumento).toBe('123456');
            expect(resultado.serie).toBe('1');
            expect(resultado.cnpjEmitente).toBe('12345678000195');
            expect(resultado.cnpjDestinatario).toBe('11111111000199');
            expect(resultado.valorTotal).toBe(500.00);
            expect(resultado.status).toBe('autorizada');
            expect(resultado.itens).toHaveLength(0);
        });
    });
    describe('Validação de XML', () => {
        it('deve rejeitar XML inválido', async () => {
            const xmlContent = '<xml>malformado';
            await expect(xmlParser.parseXML(xmlContent, 'NFe')).rejects.toThrow('Estrutura NFe não encontrada');
        });
        it('deve rejeitar tipo de documento não suportado', async () => {
            const xmlContent = '<test>teste</test>';
            await expect(xmlParser.parseXML(xmlContent, 'INVALID')).rejects.toThrow('Tipo de documento não suportado: INVALID');
        });
    });
    describe('Extração de dados', () => {
        it('deve extrair CST corretamente de diferentes grupos ICMS', async () => {
            const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <NFe>
            <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
              <ide>
                <nNF>123456</nNF>
                <serie>1</serie>
                <dhEmi>2024-01-15T14:30:45-03:00</dhEmi>
              </ide>
              <emit>
                <CNPJ>12345678000195</CNPJ>
              </emit>
              <dest>
                <CNPJ>98765432000187</CNPJ>
              </dest>
              <det nItem="1">
                <prod>
                  <cProd>001</cProd>
                  <xProd>Produto Teste</xProd>
                  <NCM>12345678</NCM>
                  <CFOP>5102</CFOP>
                  <qCom>10.0000</qCom>
                  <vUnCom>100.00</vUnCom>
                  <vProd>1000.00</vProd>
                </prod>
                <imposto>
                  <ICMS>
                    <ICMS10>
                      <CST>10</CST>
                      <pICMS>18.00</pICMS>
                      <vICMS>180.00</vICMS>
                    </ICMS10>
                  </ICMS>
                </imposto>
              </det>
              <total>
                <ICMSTot>
                  <vNF>1000.00</vNF>
                </ICMSTot>
              </total>
            </infNFe>
          </NFe>
          <protNFe>
            <infProt>
              <cStat>100</cStat>
            </infProt>
          </protNFe>
        </nfeProc>
      `;
            const resultado = await xmlParser.parseXML(xmlContent, 'NFe');
            expect(resultado.itens[0].cst).toBe('10');
        });
        it('deve lidar com valores numéricos corretamente', async () => {
            const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <NFe>
            <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
              <ide>
                <nNF>123456</nNF>
                <serie>1</serie>
                <dhEmi>2024-01-15T14:30:45-03:00</dhEmi>
              </ide>
              <emit>
                <CNPJ>12345678000195</CNPJ>
              </emit>
              <dest>
                <CNPJ>98765432000187</CNPJ>
              </dest>
              <det nItem="1">
                <prod>
                  <cProd>001</cProd>
                  <xProd>Produto Teste</xProd>
                  <NCM>12345678</NCM>
                  <CFOP>5102</CFOP>
                  <qCom>10,5000</qCom>
                  <vUnCom>100,50</vUnCom>
                  <vProd>1055,25</vProd>
                </prod>
                <imposto>
                  <ICMS>
                    <ICMS00>
                      <CST>00</CST>
                      <pICMS>18,00</pICMS>
                      <vICMS>189,95</vICMS>
                    </ICMS00>
                  </ICMS>
                </imposto>
              </det>
              <total>
                <ICMSTot>
                  <vNF>1055,25</vNF>
                </ICMSTot>
              </total>
            </infNFe>
          </NFe>
          <protNFe>
            <infProt>
              <cStat>100</cStat>
            </infProt>
          </protNFe>
        </nfeProc>
      `;
            const resultado = await xmlParser.parseXML(xmlContent, 'NFe');
            expect(resultado.itens[0].quantidade).toBe(10.5);
            expect(resultado.itens[0].valorUnitario).toBe(100.5);
            expect(resultado.itens[0].valorTotal).toBe(1055.25);
            expect(resultado.itens[0].aliquotaIcms).toBe(18.0);
            expect(resultado.itens[0].valorIcms).toBe(189.95);
        });
    });
});
//# sourceMappingURL=xml-parser.test.js.map