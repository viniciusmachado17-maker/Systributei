import { GoogleGenAI } from "@google/genai";
import { TaxBreakdown } from "../types";

// explainTaxRule uses Gemini to provide a brief explanation of the tax impact on a specific product.
export const explainTaxRule = async (
  productName: string,
  category: string,
  ncm: string,
  taxes?: TaxBreakdown
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn("Gemini: API Key não encontrada em import.meta.env.VITE_GOOGLE_API_KEY.");
      return "Chave de API não detectada no ambiente. Se você acabou de adicionar ao .env.local, por favor, REINICIE o terminal (npm run dev) para que o Vite carregue as novas configurações.";
    }

    const ai = new GoogleGenAI({ apiKey });

    const taxContext = taxes ? `
Detalhes Tributários Atuais (Simulação):
- IBS: ${(taxes.aliquotaIbs * 100).toFixed(2)}% (CST: ${taxes.cst_ibs})
- CBS: ${(taxes.aliquotaCbs * 100).toFixed(2)}% (CST: ${taxes.cst_cbs})
- Alíquota Final Combinada: ${(taxes.aliquotaFinalIbs * 100 + taxes.aliquotaFinalCbs * 100).toFixed(2)}%
- Cesta Básica: ${taxes.isCestaBasica ? 'Sim' : 'Não'}
` : '';

    const prompt = `
Atue como um especialista em Reforma Tributária Brasileira.
Produto: ${productName}
Categoria: ${category}
NCM: ${ncm}
${taxContext}

Forneça um "Insight Tributei":
1. Traga um fato interessante ou relevante sobre como a Reforma Tributária (IBS/CBS) afeta especificamente este tipo de produto ou sua categoria.
2. Seja conciso (máximo 3 frases).
3. Use um tom profissional e informativo.
`;

    console.log("Gemini: Enviando prompt...");

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    // No SDK @google/genai, o texto retornado está em response.text
    return response.text || "Não foi possível gerar uma visão detalhada no momento.";
  } catch (error: any) {
    console.error("Gemini Error:", error);

    if (error?.message?.includes('401') || error?.message?.includes('403')) {
      return "Erro de Autenticação: Verifique se sua VITE_GOOGLE_API_KEY está correta no .env.local e se o terminal foi reiniciado.";
    }

    return "Houve um problema ao consultar a IA. Por favor, tente novamente ou verifique as configurações.";
  }
};
