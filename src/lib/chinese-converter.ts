/**
 * 中文繁簡轉換工具
 * 支援繁體中文搜索簡體中文內容
 */

// 簡單的繁簡轉換映射表（常用字）
const traditionalToSimplified: Record<string, string> = {
  // 詞組優先
  '電影': '电影',
  '電視劇': '电视剧',
  '動畫': '动画',
  '紀錄片': '纪录片',
  '綜藝': '综艺',
  
  // 常用繁體字到簡體字的映射
  '電': '电', '視': '视', '劇': '剧', '動': '动', '畫': '画',
  '愛': '爱', '戀': '恋', '戰': '战', '國': '国', '學': '学', '會': '会',
  '時': '时', '間': '间', '長': '长', '開': '开', '關': '关', '門': '门',
  '來': '来', '對': '对', '說': '说', '話': '话', '語': '语', '言': '言',
  '書': '书', '讀': '读', '寫': '写', '聽': '听', '見': '见', '覺': '觉',
  '個': '个', '們': '们', '這': '这', '那': '那', '裡': '里', '邊': '边',
  '過': '过', '還': '还', '沒': '没', '別': '别', '讓': '让', '給': '给',
  '從': '从', '當': '当', '應': '应', '該': '该', '能': '能', '可': '可',
  '要': '要', '想': '想', '知': '知', '道': '道', '得': '得',
  '很': '很', '多': '多', '少': '少', '大': '大', '小': '小', '好': '好',
  '壞': '坏', '新': '新', '舊': '旧', '高': '高', '低': '低', '快': '快',
  '慢': '慢', '早': '早', '晚': '晚', '前': '前', '後': '后', '左': '左',
  '右': '右', '上': '上', '下': '下', '中': '中', '內': '内', '外': '外',
  '東': '东', '西': '西', '南': '南', '北': '北', '年': '年', '月': '月',
  '日': '日', '週': '周', '星': '星', '期': '期', '今': '今',
  '昨': '昨', '現': '现', '將': '将', '已': '已', '經': '经',
  '正': '正', '剛': '刚', '才': '才', '就': '就', '只': '只', '也': '也',
  '都': '都', '再': '再', '又': '又', '或': '或', '者': '者',
  '和': '和', '與': '与', '及': '及', '以': '以', '為': '为', '了': '了',
  '到': '到', '於': '于', '向': '向', '往': '往', '由': '由',
  '自': '自', '至': '至', '直': '直', '旁': '旁', '側': '侧',
  '方': '方', '處': '处', '所': '所', '地': '地',
  '場': '场', '位': '位', '置': '置', '點': '点', '線': '线',
  '體': '体', '積': '积', '量': '量', '數': '数', '字': '字',
  '號': '号', '碼': '码', '級': '级', '層': '层', '樓': '楼', '室': '室',
  '廳': '厅', '房': '房', '屋': '屋', '家': '家', '戶': '户',
  '窗': '窗', '牆': '墙', '壁': '壁', '頂': '顶', '底': '底',
  '板': '板', '磚': '砖', '瓦': '瓦', '石': '石', '木': '木', '竹': '竹',
  '草': '草', '花': '花', '樹': '树', '林': '林', '森': '森', '山': '山',
  '水': '水', '河': '河', '江': '江', '海': '海', '湖': '湖', '池': '池',
  '井': '井', '泉': '泉', '溪': '溪', '流': '流', '雲': '云', '雨': '雨',
  '雪': '雪', '風': '风', '雷': '雷', '火': '火', '光': '光',
  '熱': '热', '冷': '冷', '溫': '温', '涼': '凉', '暖': '暖', '乾': '干',
  '濕': '湿', '潮': '潮', '燥': '燥', '淨': '净', '髒': '脏', '亂': '乱',
  '整': '整', '齊': '齐', '潔': '洁', '美': '美', '醜': '丑', '漂': '漂',
  '亮': '亮', '暗': '暗', '清': '清', '楚': '楚', '白': '白',
  '黑': '黑', '紅': '红', '綠': '绿', '藍': '蓝', '黃': '黄', '紫': '紫',
  '粉': '粉', '灰': '灰', '棕': '棕', '橙': '橙', '銀': '银', '金': '金',
  '銅': '铜', '鐵': '铁', '鋼': '钢', '鋁': '铝', '錫': '锡', '鉛': '铅',
  '鋅': '锌', '鎳': '镍', '鈦': '钛', '鉑': '铂', '鑽': '钻', '珠': '珠',
  '寶': '宝', '玉': '玉', '礦': '矿', '油': '油', '氣': '气'
};

const simplifiedToTraditional: Record<string, string> = {};

// 建立簡體到繁體的反向映射
Object.entries(traditionalToSimplified).forEach(([traditional, simplified]) => {
  simplifiedToTraditional[simplified] = traditional;
});

/**
 * 將繁體中文轉換為簡體中文
 */
export function traditionalToSimplifiedChinese(text: string): string {
  let result = text;
  
  // 先處理詞組
  Object.entries(traditionalToSimplified).forEach(([traditional, simplified]) => {
    if (traditional.length > 1) {
      result = result.replace(new RegExp(traditional, 'g'), simplified);
    }
  });
  
  // 再處理單字
  Object.entries(traditionalToSimplified).forEach(([traditional, simplified]) => {
    if (traditional.length === 1) {
      result = result.replace(new RegExp(traditional, 'g'), simplified);
    }
  });
  
  return result;
}

/**
 * 將簡體中文轉換為繁體中文
 */
export function simplifiedToTraditionalChinese(text: string): string {
  let result = text;
  
  // 先處理詞組
  Object.entries(simplifiedToTraditional).forEach(([simplified, traditional]) => {
    if (simplified.length > 1) {
      result = result.replace(new RegExp(simplified, 'g'), traditional);
    }
  });
  
  // 再處理單字
  Object.entries(simplifiedToTraditional).forEach(([simplified, traditional]) => {
    if (simplified.length === 1) {
      result = result.replace(new RegExp(simplified, 'g'), traditional);
    }
  });
  
  return result;
}

/**
 * 生成搜索關鍵字的變體（包含繁體和簡體）
 * 用於提高搜索匹配率
 */
export function generateSearchVariants(query: string): string[] {
  const variants = new Set<string>();
  
  // 原始查詢
  variants.add(query);
  
  // 繁體轉簡體
  const simplified = traditionalToSimplifiedChinese(query);
  if (simplified !== query) {
    variants.add(simplified);
  }
  
  // 簡體轉繁體
  const traditional = simplifiedToTraditionalChinese(query);
  if (traditional !== query) {
    variants.add(traditional);
  }
  
  return Array.from(variants);
}

/**
 * 檢查文本是否包含查詢字符串（支援繁簡轉換）
 */
export function matchesQuery(text: string, query: string): boolean {
  const searchVariants = generateSearchVariants(query);
  const textVariants = generateSearchVariants(text);
  
  // 檢查任意搜索變體是否匹配任意文本變體
  for (const searchVariant of searchVariants) {
    for (const textVariant of textVariants) {
      if (textVariant.toLowerCase().includes(searchVariant.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}