import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ModelType, BettingStrategy } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateFootballAnalysis = async (
  startDate: string,
  endDate: string,
  strategy: BettingStrategy,
  leagues: string,
  onStream: (chunk: string) => void
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not found");

  const strategyInstructions = strategy === BettingStrategy.VALUE 
    ? `
    - **MODO: APOSTA DE VALOR (AGRESSIVO)**
    - Foco em encontrar **ODDS DESAJUSTADAS** (onde a probabilidade real é maior que a implícita na odd).
    - Busque odds entre **1.70 e 2.50**.
    - O Bilhete Combinado deve ter um **Retorno Potencial Alto**, aceitando um risco maior.
    - Priorize mercados como Handicap Asiático, DNB (Empate Anula) ou Over Gols em jogos disputados.
    `
    : `
    - **MODO: CONSERVADOR (SEGURANÇA)**
    - Foco na **TAXA DE ACERTO (Strike Rate)**. Minimize o risco ao máximo.
    - Busque odds seguras entre **1.25 e 1.60**.
    - O Bilhete Combinado deve priorizar a **proteção** (ex: Dupla Hipótese, Over 1.5, Handicap Positivo).
    - Critério de Confiança ALTA deve ser extremamente rígido.
    `;

  const leagueInstruction = leagues.trim() 
    ? `5. **FILTRO DE LIGAS:** A análise deve focar EXCLUSIVAMENTE ou PRIORITARIAMENTE nas seguintes competições: **${leagues}**. Se houver poucas oportunidades nestas ligas, você pode expandir para outras Ligas Top-Tier, mas mencione isso.`
    : `5. **LIGAS:** Priorize as 5 Grandes Ligas Europeias (Big 5), Primeira Liga Portugal, Brasileirão (se ativo) e competições da UEFA. Evite ligas inferiores a menos que os dados sejam cristalinos.`;

  const promptTemplate = `
  Você é um **analista profissional de apostas de futebol**, especializado em **previsões seguras, responsáveis e estritamente baseadas em dados reais e factuais**. O foco é na **integridade da informação, na minimização de riscos e na exclusividade de dados de alta fidelidade**.

O objetivo é gerar **uma análise completa, estruturada e exportável (em formato Markdown)** com todas as partidas confirmadas dentro do **intervalo de datas fornecido** e montar um **Bilhete Combinado com 4 a 6 jogos de Confiança ALTA**.

---

## 🧩 REQUISITOS E SAÍDA

1. **Entrada Necessária:** Um **intervalo de datas** no formato DD/MM/AAAA a DD/MM/AAAA.
   DATA_INICIAL = ${startDate}
   DATA_FINAL = ${endDate}

2. **Linguagem de Saída:** Todo o resultado deve ser gerado **em Português (Portugal/Brasil)**.

3. **RESTRIÇÃO DE DATAS (CRÍTICO):** Apenas analise e liste jogos que ocorram **ESTRITAMENTE** dentro do intervalo de datas de ${startDate} até ${endDate}. **Descarte imediatamente qualquer jogo fora deste período.**

4. **ESTRATÉGIA SELECIONADA:**
   ${strategyInstructions}

${leagueInstruction}

---

## 🔍 METODOLOGIA DE ANÁLISE (Etapas da IA)

### 1️⃣ Pesquisa de Dados (Foco na Alta Fidelidade e Consistência)

- **A IA deve fazer pesquisa única e abrangente** (consultando fontes de alta confiança como FlashScore, SofaScore, OddsPortal, **e especificamente https://cornerprobet.com/**) para o intervalo de datas.
- **Restrição Crucial de Fidelidade:** **NUNCA invente ou "alucine" dados, odds, resultados ou jogos.** Se a pesquisa não retornar dados concretos, informe o utilizador.
- **Coleta Fiel:** Use os **dados e odds mais consistentes e recentes encontrados na pesquisa**.

### 2️⃣ Listagem de Partidas e Pré-Análise

Para cada jogo CONFIRMADO (e DENTRO DO INTERVALO DE DATAS):

- 🏟️ **Competição** e **Equipas** (Mandante × Visitante)
- 🕒 **Horário** (Fuso de Lisboa/Brasília)
- 💰 **Odds Médias Iniciais (1X2)**
- **Determinação Preliminar:** Indicar a equipa favorita e o Resultado Mais Provável.

### 3️⃣ Análise Técnica e Estatística Detalhada

A IA deve aprofundar a análise para cada jogo listado:

- **Critérios de Decisão:** Forma Recente, H2H, Fator Casa/Fora, Lesões/Suspensões.
- **Sugestão de Aposta:** Escolher **UM** mercado otimizado, alinhado à ESTRATÉGIA SELECIONADA (${strategy === BettingStrategy.VALUE ? 'Valor' : 'Segurança'}).

---

## 🧠 JUSTIFICATIVAS E CONFIANÇA

Cada jogo selecionado deve ter:
- **Justificativa (1-2 Linhas):** Resumo da análise factual.
- **Índice de Confiança:** **BAIXA** / **MÉDIA** / **ALTA**.

> **Critério para 'Confiança ALTA':**
> ${strategy === BettingStrategy.VALUE 
    ? "Deve haver uma discrepância clara entre a probabilidade estatística e a odd oferecida (Valor Esperado Positivo). Risco aceitável se a odd compensar." 
    : "Todos os indicadores (Forma, H2H, Motivação) devem apontar para o mesmo lado. A chance de 'zebra' deve ser estatisticamente irrelevante."}

---

## 📊 SAÍDA PRINCIPAL: TABELA DE ANÁLISE COMPLETA (Markdown)

A IA deve gerar a tabela com **TODOS** os jogos analisados, no seguinte formato:

| Data | Competição | Jogo | Odds (1X2) | Equipa Favorita | Sugestão de Aposta | Mercado Otimizado | Confiança |
| ---- | ---------- | ---- | ---------- | --------------- | ------------------ | ----------------- | --------- |
| ...  | ...        | ...  | ...        | ...             | ...                | ...               | ...       |

---

## 🏅 AS 3 MELHORES OPORTUNIDADES

**Após a tabela**, a IA deve destacar:
- **As 3 melhores oportunidades** do período (Melhor relação Risco x Retorno).

---

## 🎟️ BILHETE COMBINADO FINAL (4 a 6 JOGOS)

1.  **Seleção:** Selecionar **entre 4 a 6 jogos** com a maior aderência à estratégia **${strategy}**.
2.  **Formato de Saída:**

| #   | Data | Competição | Jogo | Mercado Otimizado | Odd Estimada | Confiança |
| --- | ---- | ---------- | ---- | ----------------- | ------------ | --------- |
| 1   | ...  | ...        | ...  | ...               | ...          | ...       |

3.  **Resumo Final:** Total de Odds e Nível de Risco Geral.

---

## ⚠️ AVISO LEGAL (Rodapé)

> As análises e sugestões são informativas. Apostar envolve risco. Aposte com responsabilidade.
  `;

  return streamGeminiResponse(promptTemplate, [], ModelType.PRO, onStream);
};

export const chatWithGemini = async (
  message: string,
  images: string[] = [], // Base64
  model: ModelType = ModelType.PRO,
  onStream: (chunk: string) => void
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not found");
  
  // Convert base64 to parts if present
  const parts: any[] = [];
  
  if (images.length > 0) {
    images.forEach(img => {
      // Remove data URL prefix if present for the API call (though the SDK often handles it, cleaner to strip for raw data)
      const base64Data = img.split(',')[1] || img;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming jpeg/png, standardizing
          data: base64Data
        }
      });
    });
  }

  parts.push({ text: message });

  return streamGeminiResponse(null, parts, model, onStream);
}

async function streamGeminiResponse(
  prompt: string | null, 
  contentParts: any[], 
  model: ModelType, 
  onStream: (chunk: string) => void
): Promise<string> {
  
  const contents = prompt ? { parts: [{ text: prompt }] } : { parts: contentParts };

  // Thinking Config for Gemini 3 Pro
  const isThinkingModel = model === ModelType.PRO;

  // Add Google Search tool for live data access which is crucial for betting odds
  const tools = isThinkingModel ? [{ googleSearch: {} }] : undefined;

  const config: any = {
    // Only apply thinking config if using the Pro model
    thinkingConfig: isThinkingModel ? { thinkingBudget: 32768 } : undefined,
    // Add tools (Google Search)
    tools: tools
  };

  try {
    const result = await ai.models.generateContentStream({
      model: model,
      contents: [contents], // The SDK expects an array of Content objects
      config: config
    });

    let fullText = "";
    for await (const chunk of result) {
      const text = chunk.text; // Access directly as property, not function
      if (text) {
        fullText += text;
        onStream(text);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}