"""
正確問題：Cross_Topic 的「家族 + 引擎」系統
          能否在概念層級覆蓋 Topic_Based 的每一題？

策略：不逐詞比對，而是看每一題的「主題」和「句型」
是否都能對應到至少一個家族和至少一個引擎。
"""
import re
from pathlib import Path
from collections import defaultdict

DIR = Path(__file__).parent

# ========== 1. 家族關鍵字庫（含所有替換詞的核心詞根）==========
FAMILY_KEYWORDS = {
    '🏛️ 制度與政策': [
        'government', 'authorities', 'policymakers', 'regulation', 'legislation',
        'law', 'policy', 'reform', 'ban', 'prohibition', 'censorship', 'subsid',
        'public fund', 'taxpayer', 'oversight', 'international cooperation',
        'foreign aid', 'legalisation', 'accountability', 'transparency',
        'charity', 'grant', 'donation', 'public safety', 'infrastructure',
    ],
    '👤 受影響群體': [
        'young people', 'teenager', 'student', 'children', 'learner', 'minor',
        'graduate', 'youth', 'worker', 'employee', 'professional', 'elderly',
        'disabled', 'low-income', 'minorities', 'vulnerable', 'single parent',
        'citizen', 'individual', 'society', 'family', 'families', 'parent',
        'guardian', 'household', 'celebrities', 'athlete', 'influencer',
        'refugee', 'immigrant', 'women', 'gender',
    ],
    '💰 經濟與資源': [
        'economic', 'GDP', 'revenue', 'employment', 'job', 'company', 'companies',
        'business', 'industry', 'productiv', 'cost', 'budget', 'invest', 'funding',
        'resource', 'financial', 'career', 'entrepreneur', 'startup', 'spending',
        'consumer', 'purchase', 'luxury', 'overconsumption', 'advertising',
        'inequality', 'wealth', 'poverty', 'privilege', 'debt', 'credit', 'loan',
        'bankruptcy', 'borrowing', 'salary', 'income', 'tax', 'money',
    ],
    '🧠 健康與心理': [
        'mental health', 'stress', 'anxiety', 'depression', 'burnout', 'wellbeing',
        'motivation', 'self-esteem', 'loneliness', 'physical health', 'obesity',
        'disease', 'exercise', 'patient', 'medical', 'addiction', 'dependency',
        'overwork', 'exhaustion', 'smoking', 'tobacco', 'nicotine', 'junk food',
        'sedentary', 'malnutrition', 'health', 'psychological',
    ],
    '🌍 環境與永續': [
        'carbon', 'emission', 'greenhouse', 'CO2', 'pollution', 'EV', 'electric vehicle',
        'ecosystem', 'biodiversity', 'habitat', 'wildlife', 'conservation',
        'endangered', 'extinction', 'zoo', 'renewable', 'solar', 'wind', 'nuclear',
        'clean energy', 'waste', 'deforestation', 'climate', 'global warming',
        'food miles', 'transport emission', 'environment', 'sustainable',
        'public transport', 'cycling', 'congestion',
    ],
    '📱 科技與數位': [
        'AI', 'automation', 'robot', 'algorithm', 'machine learning', 'innovation',
        'technology', 'social media', 'platform', 'digital', 'online', 'influencer',
        'viral', 'privacy', 'data', 'surveillance', 'smartphone', 'device',
        'digital literacy', 'media literacy', 'fact-checking', 'fake news',
        'misinformation', 'propaganda', 'screen time', 'phone addiction', 'internet',
        'computer', 'app', 'software',
    ],
    '🎓 教育與發展': [
        'education', 'school', 'university', 'curricul', 'higher education',
        'skill', 'critical thinking', 'creativity', 'vocational', 'discipline',
        'exam', 'testing', 'grade', 'academic pressure', 'homework', 'assignment',
        'teacher', 'educator', 'tutor', 'mentor', 'curriculum', 'STEM',
        'childcare', 'early learning', 'kindergarten', 'preschool',
        'competition', 'cooperation', 'teamwork', 'individuality', 'conformity',
        'learn', 'teach',
    ],
    '⚖️ 倫理與自由': [
        'freedom', 'autonomy', 'choice', 'rights', 'ethical', 'moral', 'dignity',
        'consent', 'fairness', 'equality', 'equity', 'justice', 'equal opportunity',
        'social cohesion', 'inclusion', 'free speech', 'censorship', 'artistic freedom',
        'cultural identity', 'heritage', 'tradition', 'indigenous',
        'animal rights', 'animal welfare', 'animal testing',
        'punishment', 'crime', 'rehabilitation', 'prison', 'offender',
        'values',
    ],
    '🔄 生活方式': [
        'urbanisation', 'city expansion', 'overcrowding', 'cities', 'neighbourhood',
        'rural', 'fast fashion', 'textile', 'instant gratification', 'convenience',
        'vegetarian', 'plant-based', 'gift-giving', 'social custom', 'relationship',
        'community', 'guided tour', 'independent travel', 'backpacking', 'tourism',
        'domestic tourism', 'visitor', 'study abroad', 'overseas education',
        'delayed parenthood', 'late marriage', 'fertility', 'alternative medicine',
        'herbal', 'acupuncture', 'holistic', 'building code', 'safety standard',
        'housing regulation', 'language learning', 'bilingual', 'immersion',
        'living alone', 'solo living', 'single-person',
    ],
}

# ========== 2. 引擎句型偵測 ==========
ENGINE_PATTERNS = {
    'E1 改善生活': r'makes?\s.+\slife\s.+more|makes?\s.+\slife\s.+better|makes?\s.+\seasier|makes?\s.+\sricher|makes?\s.+\sfulfilling',
    'E2 造成傷害': r'it damages|damages?\s.+when|damages?\s.+because',
    'E3 太貴了': r'too expensive|too costly|too\s+\w+\s+for\s.+because',
    'E4 正向預測': r'if\s.+(?:is|are|continues|maintains|succeeds|grows|improves|encouraged|supported|funded|taught|balanced|managed|restored).+(?:will|becomes?)\s',
    'E5 負面警告': r'without\s+.+(?:we face|face\s)',
    'E6 現象描述': r'we often see|headlines show|we see\s',
    'E7 統計顯示': r'statistics show|reports show|research shows?|research indicates|studies show|surveys show',
    'E8 政府必須': r'(?:the )?government (?:must|should)|governments? (?:must|should)',
    'E9 學校應該': r'schools? (?:must|should)',
    'E10 折衷平衡': r'rather than|a balanced approach',
    'E11 反方觀點': r'(?:the )?opposing view|critics argue|counter-argument|some argue|opponents claim',
    'E12 具體舉例': r'📌 example|for instance.+in\s|for example.+in\s',
}

# ========== 3. 解析 Topic_Based ==========
def parse_topics(filepath):
    text = filepath.read_text(encoding='utf-8')
    headers = re.findall(r'^## (Topic \d+：.+)$', text, re.MULTILINE)
    parts = re.split(r'^## Topic \d+', text, flags=re.MULTILINE)
    topics = []
    for i, header in enumerate(headers):
        body = parts[i + 1] if i + 1 < len(parts) else ''
        topics.append({'title': header, 'body': body})
    return topics

# ========== 4. 概念比對 ==========
def find_families(text):
    text_lower = text.lower()
    matched = {}
    for fam_name, keywords in FAMILY_KEYWORDS.items():
        hits = []
        for kw in keywords:
            if kw.lower() in text_lower:
                hits.append(kw)
        if hits:
            matched[fam_name] = hits
    return matched

def find_engines(text):
    text_lower = text.lower()
    matched = {}
    for eng_name, pattern in ENGINE_PATTERNS.items():
        if re.search(pattern, text_lower):
            matched[eng_name] = True
    return matched

# ========== Main ==========
topic_file = DIR / 'Topic_Based_Formula_Hypernym.md'
topics = parse_topics(topic_file)

print("=" * 70)
print("📊 Cross_Topic 能否覆蓋 Topic_Based？— 概念層級分析")
print("=" * 70)
print(f"\n📄 Topic_Based: {len(topics)} 題")
print(f"📄 Cross_Topic: 9 家族 + 12 引擎\n")

full_cover = 0     # 家族 ≥ 1 AND 引擎 ≥ 3
good_cover = 0     # 家族 ≥ 1 AND 引擎 ≥ 1
no_family = []     # 找不到任何家族
no_engine = []     # 找不到任何引擎
all_results = []

fam_count = defaultdict(int)  # 每個家族被引用的次數
eng_count = defaultdict(int)

for t in topics:
    full_text = t['title'] + '\n' + t['body']
    fams = find_families(full_text)
    engs = find_engines(full_text)
    
    for f in fams:
        fam_count[f] += 1
    for e in engs:
        eng_count[e] += 1
    
    result = {
        'title': t['title'],
        'families': fams,
        'engines': engs,
        'fam_count': len(fams),
        'eng_count': len(engs),
    }
    all_results.append(result)
    
    if len(fams) >= 1 and len(engs) >= 3:
        full_cover += 1
    if len(fams) >= 1 and len(engs) >= 1:
        good_cover += 1
    if len(fams) == 0:
        no_family.append(t['title'])
    if len(engs) == 0:
        no_engine.append(t['title'])

# --- 家族覆蓋 ---
print(f"{'='*70}")
print("🏛️ 家族覆蓋")
print(f"{'='*70}")
for fam in FAMILY_KEYWORDS:
    count = fam_count.get(fam, 0)
    bar = '█' * (count // 3) + '░' * max(0, (40 - count // 3))
    print(f"  {fam}: {bar} {count}/{len(topics)}")

# --- 引擎覆蓋 ---
print(f"\n{'='*70}")
print("🔧 引擎覆蓋")
print(f"{'='*70}")
for eng in ENGINE_PATTERNS:
    count = eng_count.get(eng, 0)
    bar = '█' * (count // 3) + '░' * max(0, (40 - count // 3))
    print(f"  {eng}: {bar} {count}/{len(topics)}")

# --- 問題題目 ---
if no_family:
    print(f"\n🔴 找不到任何家族的題目 ({len(no_family)} 題):")
    for t in no_family:
        print(f"   ❌ {t}")

if no_engine:
    print(f"\n🔴 找不到任何引擎的題目 ({len(no_engine)} 題):")
    for t in no_engine:
        print(f"   ❌ {t}")

# --- 每題配對幾個家族 ---
fam_distribution = defaultdict(int)
for r in all_results:
    fam_distribution[r['fam_count']] += 1

print(f"\n{'='*70}")
print("📊 每題配對到的家族數量分佈")
print(f"{'='*70}")
for n in sorted(fam_distribution.keys()):
    bar = '█' * fam_distribution[n]
    print(f"  {n} 個家族: {bar} {fam_distribution[n]} 題")

# --- 整體結論 ---
print(f"\n{'='*70}")
print(f"📈 整體結論")
print(f"{'='*70}")
print(f"  每題至少 1 家族 + 1 引擎: {good_cover}/{len(topics)} ({good_cover/len(topics)*100:.0f}%)")
print(f"  每題至少 1 家族 + 3 引擎: {full_cover}/{len(topics)} ({full_cover/len(topics)*100:.0f}%)")
print(f"  找不到家族: {len(no_family)} 題")
print(f"  找不到引擎: {len(no_engine)} 題")

if good_cover == len(topics):
    print(f"\n  🏆 完全覆蓋！Cross_Topic 的家族+引擎能涵蓋 Topic_Based 所有 {len(topics)} 題。")
    print(f"     → 學生只需背 Cross_Topic 就能為每題找到合適的「家族 × 引擎」組合。")
elif good_cover / len(topics) >= 0.95:
    print(f"\n  🎯 幾乎完全覆蓋！僅 {len(topics) - good_cover} 題需要額外補充。")
else:
    print(f"\n  ⚠️ 有 {len(topics) - good_cover} 題無法被 Cross_Topic 涵蓋。")
print(f"{'='*70}")
