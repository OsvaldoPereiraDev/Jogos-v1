import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ModelType, BettingStrategy } from "../types";

// Safety check for process.env
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const API_KEY = getApiKey();

// Initialize client
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateFootballAnalysis = async (
  startDate: string,
  endDate: string,
  strategy: BettingStrategy,
  leagues: string,
  onStream: (chunk: string) => void
): Promise<string> => {
  if (!API_KEY) throw new Error("Chave de API não encontrada");

  // Determine prompt based on strategy
  let promptTemplate = '';

  const deepAnalysisProtocol = `
  ### 🔬 PROTOCOLO DE ANÁLISE ESPORTIVA PROFUNDA (Obrigatório para TODOS os jogos)
  Antes de sugerir qualquer aposta, você deve processar internamente uma análise neutra e objetiva baseada nestes pilares:

  1.  **Contexto da Liga:**
      *   Analise a previsibilidade atual da competição e o equilíbrio entre as equipas.
      *   Identifique tendências táticas da liga (ex: liga de muitos gols, liga física/defensiva).

  2.  **Raio-X das Equipas (Mandante vs Visitante):**
      *   **Regularidade:** Desempenho atual e evolução ao longo da temporada.
      *   **Tática:** Padrões ofensivos/defensivos e ritmo de jogo.
      *   **Casa/Fora:** Desempenho específico como mandante ou visitante (não apenas geral).

  3.  **Metadados Estatísticos (Crucial):**
      *   Compare média de gols marcados/sofridos.
      *   Compare **xG (Gols Esperados)** vs Gols Reais (para identificar sorte/azar).
      *   Posse de bola efetiva e média de chutes no alvo.

  4.  **Fatores Externos e Físicos:**
      *   **Calendário:** Cansaço acumulado (jogos recentes ou viagens longas).
      *   **Elenco:** Lesões de jogadores-chave (especialmente goleiros e artilheiros).
      *   **Clima:** Previsão de chuva/neve que possa afetar o estilo de jogo e estado do gramado.

  5.  **PREVISÃO NEUTRA:**
      *   Baseada **apenas no desempenho esportivo**, quem está em melhor fase? Quem tem mais consistência tática?
      *   *Ignore as odds nesta etapa. Foque apenas na realidade do campo.*
  `;

  const commonQualityRules = `
  ### 🛡️ FILTRO DE SEGURANÇA E DATAS (CRÍTICO - TOLERÂNCIA ZERO)
  1. **FILTRO RIGOROSO DE DATAS:**
     - O intervalo selecionado é ESTRITAMENTE: **${startDate} a ${endDate}**.
     - **Passo Obrigatório:** Para cada jogo candidato, verifique a data.
     - Se Jogo_Data < ${startDate} OU Jogo_Data > ${endDate} -> **EXCLUA IMEDIATAMENTE**.
     - Se não houver jogos qualificados nestas datas exatas, responda: "Não foram encontrados jogos de alta qualidade para as datas selecionadas (${startDate} a ${endDate})."
  
  2. **DATA E HORA:**
     - É OBRIGATÓRIO exibir a **Data e Hora** da partida na tabela.
     - Use o formato: DD/MM HH:mm (Ex: 14/05 16:30).

  3. **O Fator 'Advogado do Diabo' (Anti-Viés):**
     - Antes de confirmar qualquer aposta com Confiança ALTA ou EXTREMA, tente ativamente **REFUTAR** a sua própria tese. Pergunte-se: "Por que essa aposta daria errado?". Se houver um motivo plausível (ex: lesão de última hora, histórico de 'bogey team'), REDUZA a confiança para MÉDIA ou remova o jogo.
  `;

  // Dynamic Ticket Instruction based on user preferences
  const ticketInstruction = `
  ## 🎟️ BILHETE COMBINADO FINAL (4 a 6 JOGOS)
  
  Monte um bilhete otimizado seguindo RIGOROSAMENTE estas regras:

  1. **Seleção Exclusiva:** O bilhete deve ser composto **APENAS** por jogos que obtiveram o índice de **Confiança ALTA** ou **EXTREMA** na sua análise anterior.
  2. **Intervalo de Datas:** Todos os jogos devem ocorrer entre **${startDate} e ${endDate}**. (Pode misturar datas dentro deste intervalo).
  3. **Limite Flexível:** Selecione **entre 4 a 6 jogos**.
     - Se houver menos de 4 jogos de Confiança ALTA/EXTREMA disponíveis nestas datas, liste apenas os que existem e avise sobre a baixa liquidez. **NÃO INCLUA JOGOS DE CONFIANÇA MÉDIA/BAIXA PARA PREENCHER ESPAÇO.**
  4. **Diversificação:** 
     ${strategy === BettingStrategy.EV_PREMIUM 
       ? '- Como esta é uma estratégia EV+ (Win & BTTS), foque neste mercado. Se houver risco excessivo, busque mercados de gols (Over 2.5) nos mesmos jogos de alta confiança.' 
       : '- Diversifique os **mercados** (ex: Vitória Simples, Over/Under Gols, Handicap, Dupla Chance) para equilibrar o risco.'}
  5. **Formato de Saída (Obrigatório):**

  | # | Data / Hora | Competição | Jogo | Mercado Otimizado | Odd Estimada | Confiança |
  | - | :--- | :--- | :--- | :--- | :--- | :--- |
  | 1 | DD/MM HH:mm | ... | ... | ... | ... | **ALTA** |

  **Resumo Final:**
  - **Odd Total Combinada (Estimada):** X.XX
  - **Análise de Risco do Bilhete:** (Baixo/Médio/Alto) - *Justifique.*
  `;

  const verificationChecklist = `
  ---
  ### 🛡️ VERIFICAÇÃO FINAL ANTES DE GERAR A RESPOSTA
  Antes de enviar, revise sua própria saída:
  1. [ ] Todos os jogos listados estão entre **${startDate}** e **${endDate}**? (Se não, apague).
  2. [ ] A tabela principal tem coluna de Data/Hora?
  3. [ ] O Bilhete Combinado tem apenas jogos de Confiança ALTA/EXTREMA?
  `;

  if (strategy === BettingStrategy.EV_PREMIUM) {
    // --- EV+ PREMIUM PROMPT ---
    const leagueConstraint = leagues.trim()
        ? `\n   - **FILTRO DE LIGAS (CRÍTICO):** Analisar ESTRITAMENTE jogos das ligas: **${leagues}**. Ignore qualquer outra liga.`
        : `\n   - **LIGAS:** Priorizar Ligas Top-Tier onde os dados de xG são confiáveis.`;

    promptTemplate = `
# 🧠 PROMPT — ANÁLISE QUANTITATIVA PREDICTIVA DE ALTO VALOR (EV+ PREMIUM 2.0)

Você é um **Analista Quantitativo Profissional (Quant Trader)** e **Especialista Tático**. Sua missão é identificar oportunidades de **Valor Esperado Positivo (EV+)** primariamente no mercado **"Resultado Final & Ambas Marcam (BTTS)"**, buscando odds >= 3.00.

${deepAnalysisProtocol}

---

## 🧩 ENTRADA E RESTRIÇÕES

- **Intervalo:** ${startDate} até ${endDate}.
- **Linguagem:** Português (Portugal/Brasil).
${leagueConstraint}

- **Filtro de Consistência (Estrito):**
  ✅ **BUSCA REAL:** Use a ferramenta de busca para encontrar odds e estatísticas **atuais**.
  ✅ **Critério EV+:** Odds para "Vitória & BTTS" >= 3.00 E EV calculado >= 5%.
  ✅ **RESTRIÇÃO DE DATAS:** Apenas jogos entre **${startDate}** e **${endDate}**.
  ⛔ **FILTRO NEGATIVO:** Se um jogo for fora dessas datas, **DESCARTE IMEDIATAMENTE**.

${commonQualityRules}

---

## 🔍 ESTRUTURA DE ANÁLISE (Seguir RIGOROSAMENTE)

1. **Listagem de jogos válidos** com Odd $(\geq 3.00)$ e **Confiança EXTREMA**.
2. **Análise Quantitativa Tripla** (Domínio, Golo do _Underdog_, Contexto).
3. **Tabela de resultados detalhada** (dados reais e previsões).
4. **Top 3 Oportunidades EV+ de Alto Risco/Retorno.**
5. **Bilhete Combinado Racional (4–6 seleções).**

---

## 📊 3. TABELA DE RESULTADOS DETALHADA

| Data / Hora | Competição | Jogo (Casa x Fora) | Odd (Vitória & BTTS) | EV Calculado | Análise Quantitativa (Resumo) | Confiança |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DD/MM HH:mm | ... | ... | **>= 3.00** | **+X%** | "xG Casa 2.1 vs xGA Fora 1.8. Valor claro." | **EXTREMA** |

---

## 🏅 4. TOP 3 OPORTUNIDADES EV+
Destaque as 3 melhores oportunidades com base em EV+ e Confiança EXTREMA, com breve justificativa.

${ticketInstruction}

${verificationChecklist}
    `;
  } else if (strategy === BettingStrategy.VALUE) {
    // --- VALUE BET PROMPT ---
    const leagueInstruction = leagues.trim() 
      ? `5. **FILTRO DE LIGAS:** Focar EXCLUSIVAMENTE ou PRIORITARIAMENTE em: **${leagues}**.`
      : `5. **LIGAS:** Priorizar as grandes ligas europeias e competições UEFA.`;

    promptTemplate = `
    Você é um **Analista Esportivo Sênior** focado em **Apostas de Valor (Value Betting)**.
    Objetivo: Encontrar onde a casa de apostas errou na precificação (Odds maiores que a probabilidade real).
    Sinal visual: check_circle

    ${deepAnalysisProtocol}

  ---

  ## 🧩 REQUISITOS DA TAREFA

  1. **Intervalo:** ${startDate} até ${endDate}.
  2. **Linguagem:** Português (Portugal/Brasil).
  3. **RESTRIÇÃO DE DATAS:** O intervalo é estritamente **${startDate} a ${endDate}**.
  
  ${leagueInstruction}
  
  ${commonQualityRules}

  ---

  ## 📊 TABELA DE ANÁLISE DE VALOR

  | Data / Hora | Competição | Jogo | Odds (1X2) | Aposta Sugerida | Onde está o Valor? (Justificativa) | Confiança |
  | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
  | DD/MM HH:mm | ... | ... | ... | ... | "Odd justa 1.80, casa paga 2.20" | **ALTA** |

  ---

  ## 🏅 AS 3 MELHORES OPORTUNIDADES
  **Após a tabela**, destaque:
  * **As 3 melhores oportunidades** do período (maior **Confiança ALTA** + **Valor/Odd**).
  * **Explicação Breve** para cada uma (2 linhas).

  ${ticketInstruction}

  ${verificationChecklist}
    `;
  } else {
    // --- CONSERVATIVE PROMPT ---
    const leagueInstruction = leagues.trim() 
      ? `5. **FILTRO DE LIGAS:** Focar EXCLUSIVAMENTE ou PRIORITARIAMENTE em: **${leagues}**.`
      : `5. **LIGAS:** Priorizar as grandes ligas europeias e competições UEFA.`;

    promptTemplate = `
    Você é um **Analista Esportivo Sênior** focado em **Estratégia Conservadora**.
    Objetivo: Apostas seguras, alta taxa de acerto (Green), minimização de riscos.

    ${deepAnalysisProtocol}

  ---

  ## 🧩 REQUISITOS DA TAREFA

  1. **Intervalo:** ${startDate} até ${endDate}.
  2. **Linguagem:** Português (Portugal/Brasil).
  3. **RESTRIÇÃO DE DATAS:** O intervalo é estritamente **${startDate} a ${endDate}**.
  
  ${leagueInstruction}
  
  ${commonQualityRules}

  ---

  ## 📊 TABELA DE ANÁLISE CONSERVADORA

  | Data / Hora | Competição | Jogo | Odds | Aposta Segura | Justificativa Tática | Confiança |
  | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
  | DD/MM HH:mm | ... | ... | ... | ... | Resuma: "Time A domina posse (60%)..." | **ALTA** |

  ${ticketInstruction}

  ## ⚠️ AVISO LEGAL
  > As análises são baseadas em dados esportivos. Futebol é imprevisível. Aposte com responsabilidade.

  ${verificationChecklist}
    `;
  }

  return streamGeminiResponse(promptTemplate, [], ModelType.PRO, onStream);
};

export const chatWithGemini = async (
  message: string,
  images: string[] = [], // Base64
  model: ModelType = ModelType.PRO,
  onStream: (chunk: string) => void
): Promise<string> => {
  if (!API_KEY) throw new Error("Chave de API não encontrada");
  
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