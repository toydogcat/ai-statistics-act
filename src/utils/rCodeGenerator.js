/**
 * Generates custom academic R-script templates based on selected method and user variable mapping.
 * Matches standard practices in "給論文寫作者的進階統計指南" (顏志龍, 鄭中平).
 */
export function generateRScript(method, mapping, headers) {
  const datasetName = "my_data";
  
  // Helper to get fallback column names if not mapped
  const x = mapping.x || "X";
  const y = mapping.y || "Y";
  const w = mapping.w || "W";
  const group = mapping.group || "Group";
  const pre = mapping.pre || "PreTest";
  const post = mapping.post || "PostTest";
  const relItems = mapping.reliabilityItems && mapping.reliabilityItems.length > 0
    ? mapping.reliabilityItems
    : headers.filter(h => h !== 'ID' && h !== 'Group');

  switch (method) {
    case 'oneway-dep-anova':
      return `# =====================================================================
# 單因子相依樣本變異數分析 (One-way Repeated Measures ANOVA)
# 參考文獻：《給論文寫作者的統計指南》Unit 17
# =====================================================================

# 1. 安裝並載入必要的套件
if(!require(ez)) install.packages("ez")
library(ez)

# 2. 準備您的寬格式數據 (寬格式轉長格式以進行相依樣本分析)
# 假設欄位分別是：受試者編號、${pre}、${post}
# 請確認您的數據物件名為 ${datasetName}

# 新增 ID 欄位以作為受試者內變項識別
${datasetName}$SubjectID <- factor(1:nrow(${datasetName}))

# 轉換為長格式 (Long format)
long_data <- reshape(
  ${datasetName},
  varying = c("${pre}", "${post}"),
  v.names = "Score",
  timevar = "Time",
  times = c("Pre", "Post"),
  direction = "long"
)
long_data$Time <- factor(long_data$Time)
long_data$SubjectID <- factor(long_data$SubjectID)

# 3. 執行重複測量 ANOVA
anova_results <- ezANOVA(
  data = long_data,
  dv = Score,
  wid = SubjectID,
  within = Time,
  detailed = TRUE
)

# 4. 輸出結果與球形檢定 (Mauchly's Test)
print("=== ANOVA 統計表格 ===")
print(anova_results$ANOVA)

print("=== Mauchly 球形檢定結果 ===")
print(anova_results$"Mauchly's Test")

print("=== Greenhouse-Geisser / Huynh-Feldt 校正係數 ===")
print(anova_results$"Sphericity Corrections")
`;

    case 'multi-ind-anova':
      return `# =====================================================================
# 多因子獨立樣本變異數分析 (Factorial Independent ANOVA)
# 參考文獻：《給論文寫作者的統計指南》Unit 18 & 21
# =====================================================================

# 1. 執行二因子獨立樣本 ANOVA (假設自變項為 ${group} 與 ${w}，依變項為 ${y})
# * 代表包含主效果與交互作用項 (同 ${group} + ${w} + ${group}:${w})
model <- aov(${y} ~ ${group} * ${w}, data = ${datasetName})

# 2. 顯示 ANOVA 摘要表
print("=== 二因子獨立樣本 ANOVA 摘要表 ===")
summary_table <- summary(model)
print(summary_table)

# 3. 事後比較 (Tukey HSD)
print("=== Tukey HSD 事後多重比較 ===")
print(TukeyHSD(model))

# 4. 交互作用顯著時的「單純主效果檢定」(Simple Main Effects)
# 依據 ${w} 的不同水準，檢驗 ${group} 對 ${y} 的影響
print("=== 單純主效果檢定 (分層分析) ===")
by(${datasetName}, ${datasetName}$${w}, function(sub_df) {
  print(paste("當調節變項 ${w} =", unique(sub_df$${w})[1]))
  sub_model <- aov(${y} ~ ${group}, data = sub_df)
  print(summary(sub_model))
})
`;

    case 'multi-dep-anova':
      return `# =====================================================================
# 多因子相依樣本變異數分析 (Factorial Repeated Measures ANOVA)
# 參考文獻：《給論文寫作者的統計指南》Unit 19 & 22
# =====================================================================

library(ez)

# 新增受試者 ID
${datasetName}$SubjectID <- factor(1:nrow(${datasetName}))

# 假設有兩個受試者內變項 (時間: Pre/Post, 情境: ConditionA/ConditionB)
# 建議將寬格式轉為包含 Time, Condition, Score 的長格式 (Long data)
# 執行 ezANOVA:
# ezANOVA(
#   data = long_data,
#   dv = Score,
#   wid = SubjectID,
#   within = .(Time, Condition),
#   detailed = TRUE
# )
print("建議使用 ezANOVA 進行多因子重複測量分析。請參閱 R 語法註解轉換長格式後執行。")
`;

    case 'mixed-anova':
      return `# =====================================================================
# 多因子混合設計變異數分析 (Mixed-Design ANOVA)
# 參考文獻：《給論文寫作者的統計指南》Unit 20 & 23 & 24 (組別 x 時間)
# =====================================================================

# 1. 載入 ez 套件
if(!require(ez)) install.packages("ez")
library(ez)

# 2. 受試者內變項(重複測量)為前測/後測，受試者外變項為組別 ${group}
# 新增受試者識別碼
${datasetName}$SubjectID <- factor(1:nrow(${datasetName}))
${datasetName}$${group} <- factor(${datasetName}$${group})

# 3. 將寬格式數據轉為長格式 (Long format)
long_data <- reshape(
  ${datasetName},
  varying = c("${pre}", "${post}"),
  v.names = "Score",
  timevar = "Time",
  times = c("Pre", "Post"),
  direction = "long"
)
long_data$Time <- factor(long_data$Time)

# 4. 執行混合設計 ANOVA (Group 為 Between-subjects, Time 為 Within-subjects)
mixed_results <- ezANOVA(
  data = long_data,
  dv = Score,
  wid = SubjectID,
  within = Time,
  between = ${group},
  detailed = TRUE
)

# 5. 輸出 ANOVA 報表
print("=== 混合設計 ANOVA 統計表格 ===")
print(mixed_results$ANOVA)

# 6. 當交互作用顯著時，執行「單純主效果檢定」(Simple Main Effects)
print("=== 單純主效果檢定：各組別隨時間的變化 ===")
by(long_data, long_data$${group}, function(sub_df) {
  print(paste("組別:", unique(sub_df$${group})))
  print(summary(aov(Score ~ Time + Error(SubjectID/Time), data = sub_df)))
})
`;

    case 'logistic':
      return `# =====================================================================
# 邏吉斯迴歸分析 (Logistic Regression)
# 參考文獻：《給論文寫作者的進階統計指南》Unit 29
# =====================================================================

# 1. 執行二分邏吉斯迴歸 (預測機率)
# 假設依變項 ${y} 為二分變項 (0/1 或 類別)
${datasetName}$${y} <- as.factor(${datasetName}$${y})

model <- glm(
  ${y} ~ ${x} + ${w},
  data = ${datasetName},
  family = binomial(link = "logit")
)

# 2. 顯示模型係數與顯著性
print("=== 邏吉斯迴歸模型係數摘要 ===")
summary_info <- summary(model)
print(summary_info)

# 3. 計算勝算比 (Odds Ratio, OR) 及 95% 信賴區間
print("=== 勝算比 (Odds Ratio, Exp(B)) 與信賴區間 ===")
odds_ratios <- exp(coef(model))
ci <- exp(confint(model))
or_table <- cbind(Odds_Ratio = odds_ratios, ci)
print(or_table)

# 4. 模型適配度：Hosmer-Lemeshow 檢定
if(!require(ResourceSelection)) install.packages("ResourceSelection")
library(ResourceSelection)

# 執行 Hosmer-Lemeshow 檢定 (期望 p > 0.05 代表適配良好)
hl_test <- hoslem.test(model$y, fitted(model), g = 10)
print("=== Hosmer-Lemeshow 適配度檢定 ===")
print(hl_test)
`;

    case 'efa':
      return `# =====================================================================
# 探索性因素分析 (Exploratory Factor Analysis - EFA)
# 參考文獻：《給論文寫作者的統計指南》Unit 14 & 15
# =====================================================================

# 1. 安裝並載入 psych 套件
if(!require(psych)) install.packages("psych")
library(psych)

# 2. 篩選要進行因素分析的題目欄位 (排除 ID 與 類別變項)
# 以下選定的項目有：${relItems.join(', ')}
efa_data <- ${datasetName}[, c(${relItems.map(i => `"${i}"`).join(', ')})]

# 3. 決定因素萃取個數：平行分析 (Parallel Analysis)
print("=== 執行平行分析 (Scree Plot & Parallel Analysis) ===")
fa.parallel(efa_data, fm = "pa", fa = "fa")

# 4. 執行因素分析
# nfactors = 因素個數 (請根據平行分析或特徵值大於1決定，此處預設為 2)
# rotate = "promax" (心理特質通常相關，強烈推薦斜交旋轉 promax)
# fm = "pa" (主軸法 Principal Axis Factoring)
efa_result <- fa(
  efa_data,
  nfactors = 2,
  rotate = "promax",
  fm = "pa"
)

# 5. 輸出因素負荷量 (Factor Loadings)
print("=== 因素負荷量矩陣 (篩選大於 0.3/0.4 的負荷) ===")
print(efa_result$loadings, cutoff = 0.3, sort = TRUE)

# 6. 輸出因素相關矩陣 (斜交旋轉特有)
print("=== 因素間相關矩陣 (Factor Correlation Matrix) ===")
print(efa_result$Phi)
`;

    case 'sem':
      return `# =====================================================================
# 驗證性因素分析 (CFA) 與 結構方程模型 (SEM)
# 參考文獻：《給論文寫作者的進階統計指南》Unit 35-39
# =====================================================================

# 1. 安裝並載入 lavaan 套件 (核心 SEM 套件)
if(!require(lavaan)) install.packages("lavaan")
library(lavaan)

# 2. 定義測量模型與路徑結構 (請根據您的假設架構修改右方題目)
# =~ 代表潛在變項定義 (CFA 測量模型)
# ~ 代表因果預測路徑 (結構模型)
# ~~ 代表殘差共變關係
sem_model <- '
  # A. 測量模型 (潛在變項定義)
  # 潛在自變項 Latent_IV，由 X 欄位代表 (可擴充更多題目)
  Latent_IV =~ X
  
  # 潛在依變項 Latent_DV，由 Y 欄位代表
  Latent_DV =~ Y

  # B. 結構模型 (路徑分析)
  Latent_DV ~ Latent_IV
'

# 3. 擬合結構方程模型 (SEM)
fit <- sem(sem_model, data = ${datasetName})

# 4. 顯示適配度與參數估計
print("=== 結構方程模型 (SEM) 適配度指標與參數估計 ===")
# fit.measures = TRUE 會輸出 CFI, TLI, RMSEA, SRMR 等黃金指標
# standardized = TRUE 輸出標準化路徑係數 (Beta)
summary(fit, fit.measures = TRUE, standardized = TRUE)
`;

    default:
      return `# 未指定或進階自訂 R 分析腳本
# 您可以在此處編寫適合 ${datasetName} 數據的 R 語言統計代碼。
# 欄位清單：${headers.join(', ')}
`;
  }
}
