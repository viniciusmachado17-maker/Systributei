
import { XMLParser } from 'fast-xml-parser';
import { XMLAnalysisResult, XMLProduct } from '../types';
import { findProductByCascade, calculateTaxes } from './taxService';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

export const parseNFeXML = async (xmlContent: string, fileName: string): Promise<XMLAnalysisResult> => {
    const jsonObj = parser.parse(xmlContent);

    // Localiza a raiz infNFe
    let infNFe;
    if (jsonObj.nfeProc) {
        infNFe = jsonObj.nfeProc.NFe.infNFe;
    } else if (jsonObj.NFe) {
        infNFe = jsonObj.NFe.infNFe;
    } else {
        throw new Error("Formato de XML NFe não reconhecido.");
    }

    const ide = infNFe.ide;
    const dhEmi = ide.dhEmi || ide.dEmi;
    const total = infNFe.total.ICMSTot;
    const det = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];

    const products: XMLProduct[] = det.map((item: any) => {
        const prod = item.prod;
        const imposto = item.imposto?.ICMS;

        // Extrair origem do primeiro item do ICMS
        let orig = "0";
        if (imposto) {
            const icmsType = Object.keys(imposto)[0];
            orig = String(imposto[icmsType]?.orig ?? "0");
        }

        return {
            cProd: String(prod.cProd),
            xProd: String(prod.xProd),
            NCM: String(prod.NCM),
            cEAN: String(prod.cEAN),
            qCom: parseFloat(prod.qCom),
            vUnCom: parseFloat(prod.vUnCom),
            vProd: parseFloat(prod.vProd),
            vDesc: parseFloat(prod.vDesc || 0),
            orig,
            status: 'searching'
        };
    });

    return {
        fileName,
        date: dhEmi,
        totalValue: parseFloat(total.vNF),
        products
    };
};

export const analyzeXMLProducts = async (
    analysis: XMLAnalysisResult,
    onProgress?: (index: number, total: number) => void
): Promise<XMLAnalysisResult> => {
    const updatedProducts = [...analysis.products];

    for (let i = 0; i < updatedProducts.length; i++) {
        const item = updatedProducts[i];

        try {
            const { product: found, source } = await findProductByCascade(item.cEAN, item.NCM, item.xProd);

            if (found) {
                // Injeta o preço do XML para o cálculo de impostos ser real sobre o valor do item
                // No taxService, ele tenta usar (product as any).price || 100
                const productWithXMLPrice = {
                    ...found,
                    price: item.vUnCom // Usamos valor unitário para o breakdown unitário
                };

                updatedProducts[i] = {
                    ...item,
                    foundProduct: found,
                    taxes: calculateTaxes(productWithXMLPrice),
                    status: 'found',
                    foundBy: source
                };
            } else {
                updatedProducts[i] = {
                    ...item,
                    status: 'not_found'
                };
            }
        } catch (err) {
            console.error(`Erro ao analisar produto ${item.xProd}:`, err);
            updatedProducts[i] = {
                ...item,
                status: 'not_found'
            };
        }

        if (onProgress) {
            onProgress(i + 1, updatedProducts.length);
        }
    }

    return {
        ...analysis,
        products: updatedProducts
    };
};
