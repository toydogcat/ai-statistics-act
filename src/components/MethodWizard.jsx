import React, { useState } from 'react';
import { HelpCircle, ChevronRight, RefreshCw, BarChart2, BookOpen } from 'lucide-react';

export default function MethodWizard({ onSelectMethod }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    purpose: '',
    ivCount: '',
    groupsCount: '',
    design: '',
    dvType: '',
    modelType: '',
    catIvType: '',
    faType: ''
  });

  const handleSelect = (field, value, nextStep) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
    setStep(nextStep);
  };

  const resetWizard = () => {
    setStep(1);
    setAnswers({
      purpose: '',
      ivCount: '',
      groupsCount: '',
      design: '',
      dvType: '',
      modelType: '',
      catIvType: '',
      faType: ''
    });
  };

  // Determine Recommendation based on answers
  const getRecommendation = () => {
    const { purpose, ivCount, groupsCount, design, dvType, modelType, catIvType, faType } = answers;

    if (purpose === 'compare') {
      if (ivCount === 'one') {
        if (groupsCount === 'two') {
          if (design === 'independent') {
            return {
              id: 'ind-t',
              title: '獨立樣本 t 檢定 (Independent Samples t-test)',
              unit: 'Unit 3',
              desc: '用於比較兩個獨立組別（如：男生與女生、實驗組與對照組）在連續變項上的平均數差異。',
              book: '傻瓜跑統計 I - Unit 3'
            };
          } else {
            return {
              id: 'dep-t',
              title: '相依樣本 t 檢定 (Paired/Dependent Samples t-test)',
              unit: 'Unit 4',
              desc: '用於比較同一組受試者在重複測量或配對設計下（如：前測與後測）的平均數差異。',
              book: '傻瓜跑統計 I - Unit 4'
            };
          }
        } else {
          // three groups
          if (design === 'independent') {
            return {
              id: 'oneway-anova',
              title: '單因子獨立樣本變異數分析 (One-way Independent ANOVA)',
              unit: 'Unit 16',
              desc: '用於比較三個以上獨立組別（如：低、中、高滿意度組）在連續變項上的平均數差異。若顯著需跑事後比較。',
              book: '傻瓜跑統計 I - Unit 16'
            };
          } else {
            return {
              id: 'oneway-dep-anova',
              title: '單因子相依樣本變異數分析 (One-way Dependent ANOVA)',
              unit: 'Unit 17',
              desc: '用於同一組受試者接受三次以上重複測量（如：前測、後測、追蹤測）時的平均值比較。',
              book: '傻瓜跑統計 I - Unit 17'
            };
          }
        }
      } else {
        // multiple IVs
        if (design === 'independent') {
          return {
            id: 'multi-ind-anova',
            title: '多因子獨立樣本變異數分析 (Factorial Independent ANOVA)',
            unit: 'Unit 18, 21',
            desc: '用於探討兩個以上自變項且皆為獨立樣本時的平均數比較，重點在於檢驗「交互作用效果」(Interaction Effect)。',
            book: '傻瓜跑統計 I - Unit 18 & 21'
          };
        } else if (design === 'dependent') {
          return {
            id: 'multi-dep-anova',
            title: '多因子相依樣本變異數分析 (Factorial Dependent ANOVA)',
            unit: 'Unit 19, 22',
            desc: '所有自變項均為重複測量變項（相依樣本）時的多因子平均數比較。',
            book: '傻瓜跑統計 I - Unit 19 & 22'
          };
        } else {
          return {
            id: 'mixed-anova',
            title: '多因子混合設計變異數分析 (Mixed-Design ANOVA)',
            unit: 'Unit 20, 23, 24',
            desc: '自變項中同時包含「獨立樣本」與「相依樣本（重複測量）」時的分析。例如：組別（實驗組/對照組）× 時間（前測/後測）。',
            book: '傻瓜跑統計 I - Unit 20, 23, 24'
          };
        }
      }
    } else if (purpose === 'relation') {
      if (dvType === 'continuous') {
        if (modelType === 'correlation') {
          return {
            id: 'correlation',
            title: 'Pearson 相關分析 (Pearson Correlation)',
            unit: 'Unit 5',
            desc: '用於探討兩個連續型變項之間是否存在線性關聯，以及其關聯強度與方向（正相關或負相關）。',
            book: '傻瓜跑統計 I - Unit 5'
          };
        } else if (modelType === 'regression') {
          return {
            id: 'regression',
            title: '複迴歸分析 (Multiple Linear Regression)',
            unit: 'Unit 6, 8',
            desc: '用於探討一個或多個自變項對連續依變項的預測力（可配合階層迴歸排除控制變項影響）。',
            book: '傻瓜跑統計 I - Unit 6 & 8'
          };
        } else if (modelType === 'mediation') {
          return {
            id: 'mediation',
            title: '中介效果分析 (Mediation Analysis)',
            unit: 'Unit 7',
            desc: '研究自變項（IV）是否透過中介變項（M）間接預測依變項（DV），並包含 Sobel 檢定或 Bootstrap 顯著性檢驗。',
            book: '傻瓜跑統計 I - Unit 7'
          };
        } else {
          return {
            id: 'moderation',
            title: '調節效果 / 交互作用分析 (Moderation / Interaction Analysis)',
            unit: 'Unit 9-12',
            desc: '探討自變項與依變項之間的關係，是否隨著調節變項（W）數值高低而改變。包含變項中心化與單純斜率檢定（Simple Slope Test）。',
            book: '傻瓜跑統計 I - Unit 9-12'
          };
        }
      } else {
        // Categorical DV
        if (catIvType === 'categorical') {
          return {
            id: 'chisquare',
            title: '卡方檢定 — 兩間斷變項關聯 (Chi-square Test)',
            unit: 'Unit 13',
            desc: '用於探討兩個間斷變項（如：性別與購買意願是否買）之間的關聯性及分布的獨立性。',
            book: '傻瓜跑統計 I - Unit 13'
          };
        } else {
          return {
            id: 'logistic',
            title: '邏吉斯迴歸分析 (Logistic Regression)',
            unit: 'Unit 29',
            desc: '當依變項為二分間斷變項（如：錄取/未錄取），而自變項包含連續或類別變項時的非線性迴歸預測。',
            book: '傻瓜跑統計 II - Unit 29'
          };
        }
      }
    } else if (purpose === 'reduction') {
      if (faType === 'efa') {
        return {
          id: 'efa',
          title: '探索性因素分析 (Exploratory Factor Analysis - EFA)',
          unit: 'Unit 14, 15',
          desc: '在未知問卷題目結構下，簡化大量變項，萃取出核心因素並予以命名。推薦使用斜交旋轉以符合特質關聯。',
          book: '傻瓜跑統計 I - Unit 14-15'
        };
      } else {
        return {
          id: 'sem',
          title: '驗證性因素分析 (CFA) 與 結構方程模型 (SEM)',
          unit: 'Unit 35-39',
          desc: '用於驗證已有理論結構或測量模型是否與實際數據適配，並估計包含潛在變項的複雜因果路徑。需要在 R (lavaan) 中運行。',
          book: '傻瓜跑統計 II - Unit 35-39'
        };
      }
    }

    return null;
  };

  const rec = getRecommendation();

  return (
    <div className="glass-card-violet p-8 max-w-2xl mx-auto my-8">
      {step < 5 && !rec && (
        <div className="flex items-center space-x-2 text-accentViolet mb-4">
          <HelpCircle size={20} />
          <span className="text-sm font-semibold uppercase tracking-wider">線上統計抉擇導師 (Wizard)</span>
        </div>
      )}

      {/* STEP 1: Research Purpose */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你的研究主要目的是什麼？</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleSelect('purpose', 'compare', 2)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">比較不同組別的平均值</div>
                <p className="text-xs text-slate-400 mt-1">例如：比較男生與女生的自尊心差異、比較實驗前後的前後測表現差異。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('purpose', 'relation', 20)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">探討變項間的相關性或進行因果預測</div>
                <p className="text-xs text-slate-400 mt-1">例如：滿意度是否能預測忠誠度、中介調節變項分析等。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('purpose', 'reduction', 30)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">縮減變項、簡化問卷或驗證效度</div>
                <p className="text-xs text-slate-400 mt-1">例如：探索性因素分析 (EFA) 進行刪題、驗證性因素分析 (CFA) 與 SEM 等。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Comparing Means -> IV Count */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你有幾個自變項 (IV)？</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect('ivCount', 'one', 3)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">1 個自變項</div>
              <p className="text-xs text-slate-400 mt-2">只有單一分組依據（如：性別、或僅一種教學法）</p>
            </button>
            <button
              onClick={() => handleSelect('ivCount', 'multi', 5)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">2 個或以上自變項</div>
              <p className="text-xs text-slate-400 mt-2">多重分組交互作用（如：探討「性別」與「教學法」對成績的聯合效應）</p>
            </button>
          </div>
          <button onClick={() => setStep(1)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 3: One IV -> Groups count */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你的自變項有幾個組別？</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect('groupsCount', 'two', 4)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">2 個組別</div>
              <p className="text-xs text-slate-400 mt-2">如：男生/女生、實驗組/對照組</p>
            </button>
            <button
              onClick={() => handleSelect('groupsCount', 'three', 4)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">3 個或以上組別</div>
              <p className="text-xs text-slate-400 mt-2">如：大一/大二/大三/大四、低/中/高工作壓力組</p>
            </button>
          </div>
          <button onClick={() => setStep(2)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 4: Design relations (Independent vs Dependent) */}
      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">組別與受試者之間的關係？</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleSelect('design', 'independent', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">獨立樣本 (Between-subjects)</div>
                <p className="text-xs text-slate-400 mt-1">不同組別由完全不同的人組成（例如比較男生和女生的數值，不可能是一個人又是男又是女）。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('design', 'dependent', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">相依樣本 / 重複測量 (Within-subjects)</div>
                <p className="text-xs text-slate-400 mt-1">組別互有關聯，通常是同一批人重複接受不同測量（例如比較同一組人接受實驗前的「前測」與實驗後的「後測」）。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>
          </div>
          <button onClick={() => setStep(3)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 5: Multi-IV Design relations */}
      {step === 5 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你的多因子變異數分析，設計關係為何？</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleSelect('design', 'independent', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">完全獨立樣本設計 (Between-subjects Design)</div>
                <p className="text-xs text-slate-400 mt-1">所有自變項都是獨立分組，各組間的受試者完全沒有重複（如：性別與年級的交叉分組比較）。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('design', 'dependent', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">完全相依樣本設計 (Repeated Measures Design)</div>
                <p className="text-xs text-slate-400 mt-1">同一批人在所有自變項交叉後的所有情境下都接受重複測量。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('design', 'mixed', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">混合設計 (Mixed Design - Split-Plot)</div>
                <p className="text-xs text-slate-400 mt-1">自變項中包含一部份獨立分組、一部份重複測量。這是實驗論文最常見的架構（如：組別×時間）。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>
          </div>
          <button onClick={() => setStep(2)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 20: Relationship -> DV Type */}
      {step === 20 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你的依變項 (DV / 被預測變項) 是何種類型？</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect('dvType', 'continuous', 21)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">連續型數值</div>
              <p className="text-xs text-slate-400 mt-2">如：學術表現分數、工作滿意度得分、溫度（計量分數）</p>
            </button>
            <button
              onClick={() => handleSelect('dvType', 'categorical', 22)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">間斷/類別/二分值</div>
              <p className="text-xs text-slate-400 mt-2">如：是否購買（買/不買）、是否通過考試、升遷狀態（成功/失敗）</p>
            </button>
          </div>
          <button onClick={() => setStep(1)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 21: Continuous DV -> Model Complexity */}
      {step === 21 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你的研究變項關係屬於何種模型？</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleSelect('modelType', 'correlation', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">兩個變項之間的簡單關聯 (Correlation)</div>
                <p className="text-xs text-slate-400 mt-1">只想看 X 與 Y 之間是否有線性關係，不區分預測的因果關係。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('modelType', 'regression', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">自變項直接預測依變項 (Linear Regression)</div>
                <p className="text-xs text-slate-400 mt-1">單一或多個自變項直接預測一個依變項，包含控制變項分析。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('modelType', 'mediation', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">自變項透過第三者影響依變項 (Mediation 中介效果)</div>
                <p className="text-xs text-slate-400 mt-1">例如：X (壓力) 會讓 M (失眠) 變嚴重，進而導致 Y (績效下滑)。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('modelType', 'moderation', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">變項間的預測強度會隨其他因素改變 (Moderation 調節效果)</div>
                <p className="text-xs text-slate-400 mt-1">例如：X (智力) 能預測 Y (學業表現)，但對高 M (熱情) 的人預測力更強，對低 M 預測力較弱。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>
          </div>
          <button onClick={() => setStep(20)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 22: Categorical DV -> IV Type */}
      {step === 22 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你的自變項 (IV) 是何種類型？</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect('catIvType', 'categorical', 100)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">也是間斷/類別型</div>
              <p className="text-xs text-slate-400 mt-2">如：性別（男/女）、購買通路（實體/網路）</p>
            </button>
            <button
              onClick={() => handleSelect('catIvType', 'continuous', 100)}
              className="p-6 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 text-center transition-all duration-150 cursor-pointer"
            >
              <div className="font-bold text-lg text-slate-200">連續型數值或混合型</div>
              <p className="text-xs text-slate-400 mt-2">如：壓力值、滿意度分數，或自變項很多元</p>
            </button>
          </div>
          <button onClick={() => setStep(20)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* STEP 30: Dimension Reduction -> EFA vs CFA/SEM */}
      {step === 30 && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-100">你處於研究開發的哪一個階段？</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleSelect('faType', 'efa', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">探索未知結構 (Exploratory Factor Analysis - EFA)</div>
                <p className="text-xs text-slate-400 mt-1">目前只設計了大量題目，還不確定題目真正分成哪幾個维度（因素），需要藉由統計跑出因素模型並進行刪題選題。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>

            <button
              onClick={() => handleSelect('faType', 'sem', 100)}
              className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-accentViolet/50 bg-[#16171d]/60 hover:bg-[#1f2129]/80 flex items-center justify-between group transition-all duration-150 cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">驗證既有理論結構 (CFA 驗證性因素與 SEM 結構方程模型)</div>
                <p className="text-xs text-slate-400 mt-1">已經有成熟的因素維度架構（如別人編好的量表），想驗證手頭收集到的數據與該架構是否適配良好，或探討複雜潛在變項的徑路因果關係。</p>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-accentViolet transition-colors" />
            </button>
          </div>
          <button onClick={() => setStep(1)} className="mt-6 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">← 上一步</button>
        </div>
      )}

      {/* RECOMMENDATION RESULT */}
      {rec && (
        <div className="text-center py-4">
          <div className="inline-flex bg-accentViolet/10 p-3 rounded-full text-accentViolet mb-4 animate-bounce">
            <BarChart2 size={36} />
          </div>
          
          <h2 className="text-xs font-bold text-accentEmerald tracking-widest uppercase mb-1">
            推薦您的最佳統計方法是
          </h2>
          <h3 className="text-2xl font-black text-white tracking-tight leading-tight mb-3">
            {rec.title}
          </h3>
          
          <div className="bg-[#16171d]/80 rounded-xl p-4 border border-slate-800 max-w-md mx-auto mb-6 text-left">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-2">
              <BookOpen size={14} className="text-accentViolet" />
              <span>《傻瓜也會跑統計》手冊定位：<strong className="text-slate-200">{rec.unit}</strong></span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {rec.desc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onSelectMethod(rec.id)}
              className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <span>開始此分析 ➔</span>
            </button>
            <button
              onClick={resetWizard}
              className="btn-secondary flex items-center space-x-1 w-full sm:w-auto justify-center"
            >
              <RefreshCw size={14} />
              <span>重新檢測</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
