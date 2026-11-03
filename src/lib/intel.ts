/**
 * 骨架阶段的演示数据。
 *
 * 这里只有形状与文案，没有任何取数逻辑：页面直接 import 常量渲染。
 * 接后端时逐个替换为 Server Action / Route Handler，组件签名保持不变。
 * 公司与人名为虚构，媒体名为真实站点（链接指向媒体首页）。
 */

export const TODAY = "2026-10-28"

export type Section =
  | "政策与监管"
  | "市场与趋势"
  | "公司与产品"
  | "资本与交易"
  | "观点与研究"
  | "风险与异动"

export type Verification = "confirmed" | "single" | "unverified"

export type SourceRef = {
  site: string
  time: string
  url: string
  /** 站点图标。搜索源返回 site_icon / favicon 时直接用；演示数据用各站 favicon。 */
  icon?: string
  primary?: boolean
}

export type IntelItem = {
  id: string
  section: Section
  title: string
  summary: string
  why: string
  entities: string[]
  sources: SourceRef[]
  publishedAt: string
  fetchedAt: string
  /** 归属日期（YYYY-MM-DD）。日期筛选与日报覆盖窗口都按它算。 */
  date: string
  verification: Verification
  importance: 1 | 2 | 3
  score: number
  saved?: boolean
}

const SITE_URL: Record<string, string> = {
  财联社: "https://www.cls.cn",
  证券时报: "https://www.stcn.com",
  第一财经: "https://www.yicai.com",
  界面新闻: "https://www.jiemian.com",
  "36 氪": "https://36kr.com",
  中金研究: "https://www.cicc.com",
  高盛: "https://www.goldmansachs.com",
  工信部: "https://www.miit.gov.cn",
  央行: "https://www.pbc.gov.cn",
  上交所: "https://www.sse.com.cn",
  上海证券报: "https://www.cnstock.com",
  每日经济新闻: "https://www.nbd.com.cn",
  科创板日报: "https://www.chinastarmarket.cn",
  医保局: "https://www.nhsa.gov.cn",
  乘联会: "https://www.cpcaauto.com",
  海关总署: "http://www.customs.gov.cn",
}

const SITE_ICON: Record<string, string> = {
  财联社: "https://www.cls.cn/favicon.ico",
  证券时报: "https://www.stcn.com/favicon.ico",
  第一财经: "https://www.yicai.com/favicon.ico",
  界面新闻: "https://www.jiemian.com/favicon.ico",
  "36 氪": "https://36kr.com/favicon.ico",
  中金研究: "https://www.cicc.com/favicon.ico",
  高盛: "https://www.goldmansachs.com/favicon.ico",
  工信部: "https://www.miit.gov.cn/favicon.ico",
  央行: "https://www.pbc.gov.cn/favicon.ico",
  上交所: "https://www.sse.com.cn/favicon.ico",
  上海证券报: "https://www.cnstock.com/favicon.ico",
  每日经济新闻: "https://www.nbd.com.cn/favicon.ico",
  科创板日报: "https://www.chinastarmarket.cn/favicon.ico",
  医保局: "https://www.nhsa.gov.cn/favicon.ico",
  乘联会: "https://www.cpcaauto.com/favicon.ico",
  海关总署: "http://www.customs.gov.cn/favicon.ico",
}

function src(site: keyof typeof SITE_URL | string, time: string, primary = false): SourceRef {
  return { site, time, url: SITE_URL[site] ?? "#", icon: SITE_ICON[site], primary }
}

const RAW_INTEL_ITEMS: Omit<IntelItem, "date">[] = [
  {
    id: "i-01",
    section: "政策与监管",
    title: "央行开展 6000 亿元 MLF 操作，本月净投放 1500 亿元",
    summary:
      "中标利率 1.75% 持平，为连续第三个月净投放。机构普遍解读为对冲政府债发行与税期扰动，资金面维持中性偏松。",
    why: "MLF 连续净投放意味着短端利率上行风险下降，对高股息与长久期资产偏友好。",
    entities: ["央行", "MLF", "流动性"],
    sources: [src("财联社", "08:12", true), src("证券时报", "08:20"), src("第一财经", "08:31")],
    publishedAt: "08:12",
    fetchedAt: "08:14",
    verification: "confirmed",
    importance: 3,
    score: 96,
    saved: true,
  },
  {
    id: "i-02",
    section: "市场与趋势",
    title: "两融余额升至 2.42 万亿元，创近三年新高",
    summary:
      "近 10 个交易日增加 1860 亿元，电子、电力设备与医药生物贡献主要增量；融资买入占比升至 9.4%。",
    why: "杠杆资金回流通常领先成交额放大 1–2 周，需同步观察监管表态。",
    entities: ["两融", "杠杆资金"],
    sources: [src("证券时报", "08:05", true), src("财联社", "08:18")],
    publishedAt: "08:05",
    fetchedAt: "08:09",
    verification: "confirmed",
    importance: 2,
    score: 88,
  },
  {
    id: "i-03",
    section: "公司与产品",
    title: "存储原厂上调 NAND 合约价 10%–15%，涨价周期或延续至明年一季度",
    summary:
      "四家原厂同步调整报价，模组厂已开始锁价。渠道端库存降至 4.2 周，低于过去三年均值。",
    why: "这是本轮存储周期第一次出现「原厂 + 模组 + 渠道」三方同步涨价，比单点涨价更可信。",
    entities: ["存储", "NAND", "涨价"],
    sources: [
      src("财联社", "07:48", true),
      src("界面新闻", "07:55"),
      src("第一财经", "08:02"),
      src("36 氪", "08:10"),
      src("证券时报", "08:16"),
    ],
    publishedAt: "07:48",
    fetchedAt: "07:52",
    verification: "confirmed",
    importance: 3,
    score: 94,
    saved: true,
  },
  {
    id: "i-04",
    section: "公司与产品",
    title: "澜芯科技 12 英寸车规级功率器件产线通线，规划月产能 3 万片",
    summary:
      "一期投资 46 亿元，主打 SiC MOSFET 与 IGBT，已与两家整车厂签署框架协议，2027 年爬坡至满产。",
    why: "车规功率器件国产化率仍不足 30%，新增产能会先影响 2027 年的价格预期。",
    entities: ["澜芯科技", "SiC", "功率器件"],
    sources: [src("界面新闻", "07:30", true), src("36 氪", "07:44"), src("证券时报", "08:01")],
    publishedAt: "07:30",
    fetchedAt: "07:36",
    verification: "confirmed",
    importance: 2,
    score: 81,
  },
  {
    id: "i-05",
    section: "资本与交易",
    title: "启元智能完成 8 亿元 B 轮融资，投后估值 62 亿元",
    summary:
      "由产业基金领投，老股东跟投；资金用于具身智能中试产线与数据采集工厂，团队规模将翻倍。",
    why: "估值对应 2026 年预计收入的 9 倍，高于同类均值，关注后续是否出现估值回调。",
    entities: ["启元智能", "具身智能", "融资"],
    sources: [src("36 氪", "07:20", true), src("界面新闻", "07:38")],
    publishedAt: "07:20",
    fetchedAt: "07:26",
    verification: "confirmed",
    importance: 2,
    score: 76,
  },
  {
    id: "i-06",
    section: "政策与监管",
    title: "工信部印发算力基础设施三年行动计划，明确 2028 年智能算力占比目标",
    summary:
      "提出到 2028 年智能算力占比不低于 45%，新建大型数据中心 PUE 低于 1.15，并首次把「算力调度」列入考核。",
    why: "考核指标从「装机量」转向「利用率」，利好调度软件与液冷，不利于单纯堆卡的 IDC。",
    entities: ["工信部", "算力", "政策"],
    sources: [src("工信部", "07:10", true), src("财联社", "07:26"), src("第一财经", "07:41"), src("证券时报", "08:03")],
    publishedAt: "07:10",
    fetchedAt: "07:12",
    verification: "confirmed",
    importance: 3,
    score: 92,
  },
  {
    id: "i-07",
    section: "观点与研究",
    title: "中金：2027 年全球 AI 资本开支增速仍有望维持 20% 以上",
    summary:
      "报告上调 2027 年北美四大云厂商资本开支预测至 4680 亿美元，认为推理需求接棒训练成为主要增量。",
    why: "把「训练见顶」的担忧转向「推理接棒」，是当前市场分歧的关键变量。",
    entities: ["中金", "AI 资本开支", "云厂商"],
    sources: [src("中金研究", "07:05")],
    publishedAt: "07:05",
    fetchedAt: "07:15",
    verification: "single",
    importance: 2,
    score: 72,
  },
  {
    id: "i-08",
    section: "风险与异动",
    title: "远洲能源实控人被采取留置措施，公司称生产经营正常",
    summary:
      "公司公告称收到家属通知，尚未收到正式文书；今日开盘一字跌停，可转债临时停牌。",
    why: "仅有单一来源且公司未披露细节，需等待正式公告再判断影响范围。",
    entities: ["远洲能源", "留置", "风险"],
    sources: [src("财联社", "09:02")],
    publishedAt: "09:02",
    fetchedAt: "09:03",
    verification: "unverified",
    importance: 3,
    score: 90,
  },
  {
    id: "i-09",
    section: "公司与产品",
    title: "光伏组件主流报价环比下跌 3.2%，硅料库存升至 6 周",
    summary:
      "TOPCon 组件均价降至 0.68 元/W，二线厂商开工率下滑至 55%；硅料端库存连续四周上升。",
    why: "价格与库存同时走弱，说明本轮反弹更可能是排产节奏而非需求改善。",
    entities: ["光伏", "组件", "硅料"],
    sources: [src("证券时报", "07:58", true), src("第一财经", "08:08")],
    publishedAt: "07:58",
    fetchedAt: "08:04",
    verification: "confirmed",
    importance: 2,
    score: 74,
  },
  {
    id: "i-10",
    section: "资本与交易",
    title: "两家半导体设备企业科创板 IPO 获受理，合计拟募资 34 亿元",
    summary:
      "分别聚焦量测设备与薄膜沉积，保荐机构均为头部券商；其中一家近三年营收复合增速 41%。",
    why: "量测设备国产化率不足 15%，IPO 提速会加速一级市场对同赛道的定价。",
    entities: ["半导体设备", "IPO", "科创板"],
    sources: [src("上交所", "07:40", true), src("证券时报", "08:12")],
    publishedAt: "07:40",
    fetchedAt: "07:44",
    verification: "confirmed",
    importance: 2,
    score: 70,
  },
  {
    id: "i-11",
    section: "市场与趋势",
    title: "北向资金净买入 87 亿元，连续 5 个交易日净流入",
    summary: "电子、电力设备、非银金融获加仓，食品饮料遭减持；成交占比回升至 13.6%。",
    why: "外资连续流入与两融回升同步出现，是风险偏好修复的第二个确认信号。",
    entities: ["北向资金", "外资"],
    sources: [src("财联社", "08:26")],
    publishedAt: "08:26",
    fetchedAt: "08:28",
    verification: "single",
    importance: 1,
    score: 62,
  },
  {
    id: "i-12",
    section: "观点与研究",
    title: "高盛上调全球半导体设备支出预测，2027 年同比 +18%",
    summary: "上调主要来自先进制程扩产与 HBM 相关设备，认为设备端景气度将滞后晶圆价格 2 个季度。",
    why: "与国内设备 IPO 提速形成交叉验证，设备链可能是明年上半年最确定的方向之一。",
    entities: ["高盛", "半导体设备", "HBM"],
    sources: [src("高盛", "06:50")],
    publishedAt: "06:50",
    fetchedAt: "07:02",
    verification: "single",
    importance: 2,
    score: 68,
  },
  {
    id: "i-13",
    section: "公司与产品",
    title: "国内某 12 英寸晶圆厂追加 28 亿元设备招标，刻蚀与薄膜沉积占七成",
    summary:
      "招标清单显示 68 台主设备，国产厂商中标比例升至 46%，交付集中在 2027 年上半年。",
    why: "国产设备中标比例首次接近半数，说明验证周期在缩短。",
    entities: ["晶圆厂", "刻蚀", "薄膜沉积"],
    sources: [src("财联社", "07:36", true), src("上海证券报", "07:52")],
    publishedAt: "07:36",
    fetchedAt: "07:40",
    verification: "confirmed",
    importance: 3,
    score: 93,
  },
  {
    id: "i-14",
    section: "资本与交易",
    title: "国家级产业基金完成首笔出资，投向先进封装与量测设备",
    summary: "首期规模 120 亿元，两只子基金分别聚焦先进封装与量测，已签署 3 个项目。",
    why: "资金投向从「扩产」转向「补短板」，量测设备是最大受益环节。",
    entities: ["产业基金", "先进封装", "量测"],
    sources: [src("证券时报", "08:04", true), src("第一财经", "08:15")],
    publishedAt: "08:04",
    fetchedAt: "08:09",
    verification: "confirmed",
    importance: 2,
    score: 78,
  },
  {
    id: "i-15",
    section: "公司与产品",
    title: "8 英寸 SiC 衬底价格环比下跌 6%，产能释放快于需求",
    summary: "8 英寸衬底均价降至 6800 元/片，二线厂商开工率不足六成，器件端仍在去库。",
    why: "衬底先于器件降价，2027 年 SiC 器件毛利承压。",
    entities: ["SiC", "衬底", "功率器件"],
    sources: [src("界面新闻", "07:22", true), src("财联社", "07:40")],
    publishedAt: "07:22",
    fetchedAt: "07:27",
    verification: "confirmed",
    importance: 2,
    score: 74,
  },
  {
    id: "i-16",
    section: "公司与产品",
    title: "存储模组厂上调 DDR5 模组报价 8%，现货交期拉长至 6 周",
    summary: "原厂优先保障服务器客户，PC 端模组供应收紧；渠道商开始囤货。",
    why: "与 NAND 涨价形成共振，存储景气从原厂向模组传导。",
    entities: ["DDR5", "存储模组"],
    sources: [src("财联社", "08:08", true), src("每日经济新闻", "08:21")],
    publishedAt: "08:08",
    fetchedAt: "08:12",
    verification: "confirmed",
    importance: 2,
    score: 80,
  },
  {
    id: "i-17",
    section: "市场与趋势",
    title: "半导体设备进口额连续三个月同比转正，9 月同比 +14%",
    summary: "9 月进口 42.6 亿美元，刻蚀与光刻设备贡献主要增量。",
    why: "进口转正通常领先国内设备招标 1–2 个季度。",
    entities: ["半导体设备", "进口"],
    sources: [src("海关总署", "07:15", true), src("证券时报", "07:48")],
    publishedAt: "07:15",
    fetchedAt: "07:20",
    verification: "confirmed",
    importance: 2,
    score: 72,
  },
  {
    id: "i-18",
    section: "公司与产品",
    title: "两家封测厂上调先进封装报价，CoWoS 类产能仍紧张",
    summary: "2.5D 封装报价上调 10%–12%，交期排至明年二季度，客户以 AI 芯片与 HBM 为主。",
    why: "先进封装成为 AI 算力的第二瓶颈，涨价会向芯片端传导。",
    entities: ["先进封装", "CoWoS", "HBM"],
    sources: [src("财联社", "06:58", true), src("界面新闻", "07:12"), src("36 氪", "07:30")],
    publishedAt: "06:58",
    fetchedAt: "07:05",
    verification: "confirmed",
    importance: 3,
    score: 89,
  },
  {
    id: "i-19",
    section: "公司与产品",
    title: "某云厂商发布 720B 开源模型，推理成本降至每百万 token 0.8 元",
    summary: "模型在 12 项基准上接近闭源头部，权重与推理代码同步开放，单卡显存需求下降 35%。",
    why: "推理成本再降一个量级，应用层的商业模式会重新洗牌。",
    entities: ["开源模型", "推理成本"],
    sources: [src("36 氪", "07:05", true), src("财联社", "07:25"), src("第一财经", "07:44")],
    publishedAt: "07:05",
    fetchedAt: "07:10",
    verification: "confirmed",
    importance: 3,
    score: 94,
  },
  {
    id: "i-20",
    section: "政策与监管",
    title: "智算中心上架率纳入地方考核，西部两省先行试点",
    summary: "考核指标包括上架率、算力利用率与绿电占比，未达标项目不再新增能耗指标。",
    why: "从「建算力」转向「用算力」，IDC 与调度软件开始分化。",
    entities: ["智算中心", "上架率", "能耗"],
    sources: [src("工信部", "07:08", true), src("财联社", "07:33")],
    publishedAt: "07:08",
    fetchedAt: "07:12",
    verification: "confirmed",
    importance: 3,
    score: 90,
  },
  {
    id: "i-21",
    section: "公司与产品",
    title: "HBM4 样品送测，带宽较上一代提升 40%",
    summary: "三家客户进入验证阶段，预计 2027 年下半年量产；封装难度提升带动设备需求。",
    why: "HBM4 是 2027 年 AI 服务器最确定的增量。",
    entities: ["HBM4", "存储", "封装"],
    sources: [src("科创板日报", "06:52", true), src("界面新闻", "07:18")],
    publishedAt: "06:52",
    fetchedAt: "06:58",
    verification: "confirmed",
    importance: 3,
    score: 91,
  },
  {
    id: "i-22",
    section: "公司与产品",
    title: "启元智能发布具身智能数据集，覆盖 12 类工业场景",
    summary: "数据集含 180 万条真机轨迹，向开发者免费开放，同步开源采集硬件方案。",
    why: "数据是具身智能的瓶颈，开放数据集可能加速行业收敛。",
    entities: ["启元智能", "具身智能", "数据集"],
    sources: [src("36 氪", "07:52", true), src("第一财经", "08:06")],
    publishedAt: "07:52",
    fetchedAt: "07:58",
    verification: "confirmed",
    importance: 2,
    score: 76,
  },
  {
    id: "i-23",
    section: "资本与交易",
    title: "某 AI 应用公司 ARR 突破 3 亿元，续费率 82%",
    summary: "主要收入来自代码助手与客服 Agent，客单价同比提升 27%。",
    why: "应用层开始出现可验证的单位经济模型。",
    entities: ["AI 应用", "ARR"],
    sources: [src("36 氪", "07:14", true), src("财联社", "07:29")],
    publishedAt: "07:14",
    fetchedAt: "07:19",
    verification: "confirmed",
    importance: 2,
    score: 73,
  },
  {
    id: "i-24",
    section: "公司与产品",
    title: "运营商 20 亿元 AI 服务器集采落地，国产化率要求 70%",
    summary: "共 4 个标包，推理型服务器占比 65%，中标厂商以国产芯片方案为主。",
    why: "运营商集采是国产 AI 芯片最大的确定性订单来源。",
    entities: ["运营商", "AI 服务器", "国产芯片"],
    sources: [src("财联社", "06:45", true), src("证券时报", "07:02")],
    publishedAt: "06:45",
    fetchedAt: "06:50",
    verification: "confirmed",
    importance: 3,
    score: 87,
  },
  {
    id: "i-25",
    section: "公司与产品",
    title: "模型价格战延续，三家厂商同步下调 API 价格",
    summary: "主力模型输入价格降幅 30%–50%，长上下文不再单独加价。",
    why: "价格战压缩中间层利润，利好有场景的应用公司。",
    entities: ["API 价格", "模型厂商"],
    sources: [src("第一财经", "08:18", true), src("36 氪", "08:26")],
    publishedAt: "08:18",
    fetchedAt: "08:24",
    verification: "confirmed",
    importance: 2,
    score: 71,
  },
  {
    id: "i-26",
    section: "公司与产品",
    title: "固态电池中试线贯通，硫化物路线能量密度达 420Wh/kg",
    summary: "中试线年产能 0.2GWh，循环 800 次容量保持率 88%，计划 2027 年装车验证。",
    why: "硫化物路线首次给出可复现的循环数据，产业化时间表前移。",
    entities: ["固态电池", "硫化物", "能量密度"],
    sources: [src("财联社", "07:10", true), src("界面新闻", "07:26"), src("36 氪", "07:41")],
    publishedAt: "07:10",
    fetchedAt: "07:15",
    verification: "confirmed",
    importance: 3,
    score: 95,
  },
  {
    id: "i-27",
    section: "市场与趋势",
    title: "碳酸锂现货价格跌破 7 万元/吨，锂盐厂减产",
    summary: "电池级碳酸锂均价 6.85 万元/吨，环比 -9%，江西两家锂盐厂检修停产。",
    why: "成本端下行利好电池厂，但会压制上游资本开支。",
    entities: ["碳酸锂", "锂盐"],
    sources: [src("上海证券报", "07:06", true), src("财联社", "07:19")],
    publishedAt: "07:06",
    fetchedAt: "07:11",
    verification: "confirmed",
    importance: 2,
    score: 75,
  },
  {
    id: "i-28",
    section: "公司与产品",
    title: "某车企 9 月交付 4.2 万辆，环比 +18%",
    summary: "新车型贡献 1.1 万辆，单车均价 21.4 万元，出口占比升至 23%。",
    why: "交付超预期主要来自渠道下沉，需观察 10 月订单持续性。",
    entities: ["交付量", "新能源车"],
    sources: [src("36 氪", "07:33", true), src("第一财经", "07:50")],
    publishedAt: "07:33",
    fetchedAt: "07:38",
    verification: "confirmed",
    importance: 2,
    score: 70,
  },
  {
    id: "i-29",
    section: "政策与监管",
    title: "欧盟对华电动车反补贴调查终裁延期三个月",
    summary: "终裁推迟至明年 1 月，期间维持临时关税，多家车企调整欧洲发运节奏。",
    why: "延期给出窗口期，但不确定性仍在。",
    entities: ["欧盟", "反补贴", "出口"],
    sources: [src("财联社", "07:02", true), src("界面新闻", "07:21")],
    publishedAt: "07:02",
    fetchedAt: "07:07",
    verification: "confirmed",
    importance: 2,
    score: 77,
  },
  {
    id: "i-30",
    section: "公司与产品",
    title: "储能招标价创新低，2 小时系统均价 0.48 元/Wh",
    summary: "本月已完成 12GWh 招标，均价环比 -7%，央企集采占比过半。",
    why: "价格战从电芯蔓延到系统集成，二线厂商现金流承压。",
    entities: ["储能", "招标", "系统集成"],
    sources: [src("证券时报", "07:44", true), src("财联社", "08:01")],
    publishedAt: "07:44",
    fetchedAt: "07:49",
    verification: "confirmed",
    importance: 2,
    score: 72,
  },
  {
    id: "i-31",
    section: "公司与产品",
    title: "公共充电桩保有量突破 1400 万台，利用率回升至 6.8%",
    summary: "快充占比升至 46%，高速公路服务区覆盖率 98%，单桩日均充电量 118 度。",
    why: "利用率跨过盈亏平衡线，运营商资本开支可能重启。",
    entities: ["充电桩", "利用率"],
    sources: [src("乘联会", "06:40", true), src("第一财经", "07:08")],
    publishedAt: "06:40",
    fetchedAt: "06:46",
    verification: "confirmed",
    importance: 1,
    score: 64,
  },
  {
    id: "i-32",
    section: "政策与监管",
    title: "第十一批集采文件发布，涉及 42 个品种",
    summary: "首次纳入 6 个生物类似药，规则延续「带量采购 + 多家中选」，最高有效申报价下调。",
    why: "生物药集采落地快于预期，创新药与仿制药估值继续分化。",
    entities: ["集采", "生物类似药"],
    sources: [src("医保局", "07:12", true), src("证券时报", "07:35")],
    publishedAt: "07:12",
    fetchedAt: "07:16",
    verification: "confirmed",
    importance: 3,
    score: 86,
  },
  {
    id: "i-33",
    section: "资本与交易",
    title: "某创新药企与海外药企达成 12 亿美元授权合作",
    summary: "首付款 1.8 亿美元，里程碑合计 10.2 亿美元，标的为双抗管线。",
    why: "首付款比例回升，说明海外买方对国产管线的信心在修复。",
    entities: ["License-out", "双抗"],
    sources: [src("财联社", "07:28", true), src("界面新闻", "07:46")],
    publishedAt: "07:28",
    fetchedAt: "07:33",
    verification: "confirmed",
    importance: 3,
    score: 84,
  },
  {
    id: "i-34",
    section: "公司与产品",
    title: "医保谈判启动，目录外 168 个药品通过初审",
    summary: "其中 42 个为罕见病用药，谈判周期较往年缩短两周。",
    why: "谈判提速意味着放量节奏前移。",
    entities: ["医保谈判", "罕见病"],
    sources: [src("医保局", "07:55", true), src("第一财经", "08:12")],
    publishedAt: "07:55",
    fetchedAt: "08:00",
    verification: "confirmed",
    importance: 2,
    score: 75,
  },
  {
    id: "i-35",
    section: "市场与趋势",
    title: "9 月社融增量 3.8 万亿元，企业中长期贷款同比多增 3200 亿元",
    summary: "社融存量增速 8.6%，政府债贡献过半，居民短贷连续两月回升。",
    why: "企业长贷改善是投资意愿修复的领先信号。",
    entities: ["社融", "中长期贷款"],
    sources: [src("央行", "07:20", true), src("财联社", "07:42")],
    publishedAt: "07:20",
    fetchedAt: "07:25",
    verification: "confirmed",
    importance: 3,
    score: 88,
  },
  {
    id: "i-36",
    section: "市场与趋势",
    title: "人民币兑美元中间价升至 7.05，创年内新高",
    summary: "离岸价同步走强，结汇需求集中释放，远期点回落至 2023 年以来低位。",
    why: "汇率走强利于外资流入，但对出口链形成压力。",
    entities: ["汇率", "人民币"],
    sources: [src("财联社", "07:58", true), src("证券时报", "08:14")],
    publishedAt: "07:58",
    fetchedAt: "08:03",
    verification: "confirmed",
    importance: 2,
    score: 73,
  },
  {
    id: "i-37",
    section: "政策与监管",
    title: "国常会部署扩大服务消费，涉及文旅与养老",
    summary: "提出放宽服务业准入、增加再贷款额度，具体细则由部委月底前出台。",
    why: "服务消费是下半年政策的主要抓手，关注细则落地。",
    entities: ["服务消费", "国常会"],
    sources: [src("财联社", "06:48", true), src("第一财经", "07:11")],
    publishedAt: "06:48",
    fetchedAt: "06:54",
    verification: "confirmed",
    importance: 2,
    score: 79,
  },
  {
    id: "i-38",
    section: "公司与产品",
    title: "国产 PD-1 出海东南亚，首年销售目标 3 亿美元",
    summary: "已进入 4 个国家的医保目录，合作方负责注册与商业化。",
    why: "新兴市场定价压力小，是创新药出海的第二条路径。",
    entities: ["PD-1", "出海", "东南亚"],
    sources: [src("界面新闻", "08:02", true), src("财联社", "08:20")],
    publishedAt: "08:02",
    fetchedAt: "08:07",
    verification: "confirmed",
    importance: 2,
    score: 69,
  },
  {
    id: "i-39",
    section: "公司与产品",
    title: "CXO 龙头新签订单同比 +22%，海外客户占比回升",
    summary: "在手订单覆盖未来 18 个月，产能利用率回到 78%。",
    why: "海外订单回暖是 CXO 周期的第一个拐点信号。",
    entities: ["CXO", "订单"],
    sources: [src("证券时报", "07:24", true), src("第一财经", "07:39")],
    publishedAt: "07:24",
    fetchedAt: "07:29",
    verification: "confirmed",
    importance: 2,
    score: 71,
  },
  {
    id: "i-40",
    section: "资本与交易",
    title: "某 ADC 企业完成 5 亿元 C 轮，管线进入 II 期",
    summary: "由产业资本领投，资金用于临床推进与商业化产能建设。",
    why: "ADC 赛道的估值仍在修复，一级市场开始出现分化。",
    entities: ["ADC", "融资"],
    sources: [src("36 氪", "08:10", true), src("界面新闻", "08:24")],
    publishedAt: "08:10",
    fetchedAt: "08:16",
    verification: "single",
    importance: 1,
    score: 62,
  },
]

/**
 * 骨架期把 40 条情报分布到最近 5 个交易日，日期筛选与「当日情报数」才有内容。
 * 顺序保持不变：每一天内部仍是原来的重要度 / 评分顺序。
 */
const DATE_PLAN: { date: string; count: number }[] = [
  { date: "2026-10-28", count: 18 },
  { date: "2026-10-27", count: 9 },
  { date: "2026-10-26", count: 7 },
  { date: "2026-10-23", count: 4 },
  { date: "2026-10-22", count: 2 },
]

export const INTEL_ITEMS: IntelItem[] = (() => {
  const dates = DATE_PLAN.flatMap(({ date, count }) =>
    Array.from({ length: count }, () => date)
  )
  return RAW_INTEL_ITEMS.map((item, index) => ({
    ...item,
    date: dates[index] ?? "2026-10-28",
  }))
})()

export type BriefStatus = "已发布" | "生成中" | "生成失败" | "推送失败"

export type Brief = {
  id: string
  date: string
  weekday: string
  title: string
  summary: string
  status: BriefStatus
  revision: number
  items: number
  sections: number
  channels: string[]
  /** 打开率只给运营看板用，读者页不展示 */
  openRate: number | null
  readMinutes: number
  createdAt: string
  publishedAt: string | null
}

export const BRIEFS: Brief[] = [
  {
    id: "b-1028",
    date: "2026-10-28",
    weekday: "周三",
    title: "存储涨价与算力新政",
    summary: "存储原厂同步上调合约价，算力新政把调度利用率写进考核，两融与北向同时回暖。",
    status: "已发布",
    revision: 1,
    items: 18,
    sections: 4,
    channels: ["站内", "企业微信", "钉钉", "飞书"],
    openRate: 71,
    readMinutes: 7,
    createdAt: "08:22",
    publishedAt: "08:30",
  },
  {
    id: "b-1027",
    date: "2026-10-27",
    weekday: "周二",
    title: "两融新高与美债利率回落",
    summary: "两融余额创三年新高，美债利率回落带动成长股反弹，外资连续四日净流入。",
    status: "已发布",
    revision: 2,
    items: 9,
    sections: 3,
    channels: ["站内", "企业微信", "飞书", "邮件"],
    openRate: 68,
    readMinutes: 8,
    createdAt: "08:18",
    publishedAt: "08:30",
  },
  {
    id: "b-1026",
    date: "2026-10-26",
    weekday: "周一",
    title: "光伏排产下修与医保谈判启动",
    summary: "组件排产下修、硅料库存回升，第十一批集采文件发布，医保谈判同步启动。",
    status: "已发布",
    revision: 1,
    items: 7,
    sections: 3,
    channels: ["站内", "企业微信", "钉钉", "飞书"],
    openRate: 61,
    readMinutes: 8,
    createdAt: "08:20",
    publishedAt: "08:30",
  },
  {
    id: "b-1026w",
    date: "2026-10-26",
    weekday: "周一",
    title: "周报 · 第 43 周情报综述",
    summary: "一周五条主线：存储涨价、算力考核、固态电池中试、集采落地、汇率走强。",
    status: "已发布",
    revision: 1,
    items: 128,
    sections: 4,
    channels: ["站内", "飞书", "邮件"],
    openRate: 54,
    readMinutes: 12,
    createdAt: "09:02",
    publishedAt: "09:30",
  },
  {
    id: "b-1024",
    date: "2026-10-24",
    weekday: "周五",
    title: "设备招标密集落地",
    summary: "三家晶圆厂同日发布设备招标，国产厂商中标比例接近半数。",
    status: "推送失败",
    revision: 1,
    items: 19,
    sections: 6,
    channels: ["站内", "企业微信"],
    openRate: null,
    readMinutes: 7,
    createdAt: "08:21",
    publishedAt: null,
  },
  {
    id: "b-1023",
    date: "2026-10-23",
    weekday: "周四",
    title: "储能招标价创新低",
    summary: "2 小时储能系统均价跌破 0.5 元/Wh，央企集采占比过半，二线厂商承压。",
    status: "已发布",
    revision: 1,
    items: 4,
    sections: 2,
    channels: ["站内", "企业微信", "钉钉", "飞书", "邮件"],
    openRate: 72,
    readMinutes: 7,
    createdAt: "08:19",
    publishedAt: "08:30",
  },
]

export type BriefReportSection = {
  title: string
  paragraphs: string[]
}

/**
 * 日报正文：AI 对覆盖窗口内全部情报的整合稿，不是条目罗列。
 * `[n]` 是行内引用标记，n 对应 BriefReport.sourceIds 里的序号。
 */
export type BriefReport = {
  coverage: string
  /** AI 直接产出的 Markdown；旧样例/旧实时数据没有这个字段，渲染时再转换。 */
  markdown?: string
  lead: string
  sections: BriefReportSection[]
  takeaways: string[]
  sourceIds: string[]
}

export const BRIEF_REPORTS: Record<string, BriefReport> = {
  "b-1028": {
    coverage: "10 月 27 日 08:00 — 10 月 28 日 08:00",
    lead: "过去 24 小时，三条主线同时往前推了一步：存储链从原厂涨价传导到模组与封装，算力政策从「建多少」转向「用得好不好」，流动性与风险偏好在同一天给出第二个确认信号。放在一起看，上游涨价的确定性在上升，需求侧的验证仍未到位——这是本期最需要记住的判断。",
    sections: [
      {
        title: "存储：三个环节第一次同向涨价",
        paragraphs: [
          "存储原厂把 NAND 合约价上调 10%–15%，渠道库存降到 4.2 周[1]。过去一年，涨价大多停留在原厂报价单上，这一次不同：模组厂随后把 DDR5 报价上调 8%，现货交期拉长到 6 周[2]；封测端的 2.5D 封装报价再涨 10%–12%，CoWoS 类产能排到明年二季度[3]。",
          "原厂、模组、封装三个环节同向调价，是本轮周期第一次出现的组合。它意味着涨价不再是「预期」，而是已经进入下游的成本表：对上游是利润修复，对模组与封测是毛利挤压，对终端则取决于能否顺利提价。春节前的备货窗口是关键验证期。",
        ],
      },
      {
        title: "算力：从装机量转向利用率",
        paragraphs: [
          "工信部把智算中心的上架率、算力利用率与绿电占比纳入地方考核，未达标项目不再新增能耗指标[4]。同一天，某云厂商把 720B 模型开源，推理成本降到每百万 token 0.8 元[5]。",
          "两条消息放在一起看，算力的稀缺性正在从「卡」转向「电与调度」。考核口径一变，单纯堆卡的 IDC 逻辑被削弱，调度软件、液冷与绿电配套的相对价值上升；模型侧成本继续下降，则会压缩中间层，利好有真实场景的应用公司。",
        ],
      },
      {
        title: "流动性：修复的第二个确认",
        paragraphs: [
          "央行开展 6000 亿元 MLF 操作，本月净投放 1500 亿元，中标利率持平[6]；两融余额升至 2.42 万亿元，创近三年新高[7]；人民币中间价升至 7.05，创年内新高[8]。",
          "三条数据指向同一方向：内部流动性宽松、杠杆资金回流、外部汇率走强。这是 9 月以来风险偏好修复的第二个确认信号。第三个信号要看企业中长期贷款能否延续——单靠交易型资金，撑不起一轮持续行情。",
        ],
      },
      {
        title: "产业侧的两个增量：设备与固态电池",
        paragraphs: [
          "某 12 英寸晶圆厂追加 28 亿元设备招标，国产厂商中标比例升至 46%[9]；固态电池中试线贯通，硫化物路线能量密度达到 420Wh/kg，800 次循环容量保持率 88%[10]。",
          "前者说明国产设备的验证周期在缩短，后者把固态电池的产业化时间表往前推了一步。两个增量都不在「需求爆发」的叙事里，而在「供给能力」的爬坡上——这决定的是 2027 年的成本曲线，而不是这个季度的订单。",
        ],
      },
    ],
    takeaways: [
      "存储涨价还能延续一个季度，但模组与封测的毛利会在明年二季度被原厂挤压，关注春节前的备货与提价落地。",
      "算力考核转向利用率，利好调度软件、液冷与绿电配套；单纯堆卡的 IDC 需要重新算账。",
      "流动性修复已确认两次，第三次看企业中长期贷款；在此之前，行情更可能是结构性的。",
    ],
    sourceIds: ["i-03", "i-16", "i-18", "i-06", "i-19", "i-01", "i-02", "i-36", "i-13", "i-26"],
  },
  "b-1027": {
    coverage: "10 月 26 日 08:00 — 10 月 27 日 08:00",
    lead: "昨天的关键词是「杠杆回归」。两融余额创三年新高，美债利率回落，外资连续第四日净流入；但光伏排产下修与设备招标的密集落地提醒我们，资金面的热与基本面的冷可以同时存在。",
    sections: [
      {
        title: "资金：杠杆与外资同向",
        paragraphs: [
          "两融余额升至 2.42 万亿元，10 个交易日增加 1860 亿元，融资买入占比回到 9.4%[1]；北向资金连续第四日净流入，电子与电力设备获加仓[2]。",
          "杠杆资金与外资同时回流，通常对应风险偏好的阶段性修复。但两融的增量集中在少数高波动板块，结构比总量更值得盯。",
        ],
      },
      {
        title: "光伏：排产下修不是需求消失",
        paragraphs: [
          "组件均价环比下跌 3.2%，硅料库存升至 6 周，二线厂商开工率降到 55%[3]。",
          "价格与库存同时走弱，说明本轮反弹更像排产节奏而非需求改善。真正的拐点要看组件出口与国内装机能否在四季度末同步回升。",
        ],
      },
      {
        title: "设备：IPO 与订单互为验证",
        paragraphs: [
          "两家半导体设备企业科创板 IPO 获受理，合计拟募资 34 亿元[4]；高盛上调 2027 年全球设备支出预测至同比 +18%[5]。",
          "一级市场与海外卖方同时给设备链定价，说明这条线的共识在形成。风险在于订单兑现的节奏——设备招标通常滞后晶圆价格两个季度。",
        ],
      },
    ],
    takeaways: [
      "杠杆资金回流是交易性信号，不等于基本面反转；两融结构比总量更重要。",
      "光伏的供给出清还没结束，价格反弹前先看库存与开工率。",
    ],
    sourceIds: ["i-02", "i-11", "i-09", "i-10", "i-12"],
  },
  "b-1026": {
    coverage: "10 月 25 日 08:00 — 10 月 26 日 08:00",
    lead: "周一的两件事决定了本周的基调：医保谈判与第十一批集采同时启动，医药的政策周期重新开始；光伏排产继续下修，新能源的供给出清还在半途。",
    sections: [
      {
        title: "医药：政策周期重启",
        paragraphs: [
          "第十一批集采文件发布，涉及 42 个品种，首次纳入 6 个生物类似药[1]；医保谈判同步启动，目录外 168 个药品通过初审[2]。",
          "集采与谈判同日推进，意味着医保端的控费节奏没有放松。创新药与仿制药的估值会继续分化，真正的变量是出海授权能否接棒国内放量。",
        ],
      },
      {
        title: "光伏：排产下修的连锁反应",
        paragraphs: [
          "组件均价环比 -3.2%，硅料库存升至 6 周，二线开工率 55%[3]。",
          "排产下修会先影响辅材与设备订单，再传导到硅料价格。短期看不到需求侧的强刺激，行业更可能以时间换空间。",
        ],
      },
      {
        title: "算力与储能：两条独立的景气线",
        paragraphs: [
          "算力三年行动计划把调度利用率写进考核[4]；储能 2 小时系统均价跌到 0.48 元/Wh[5]。",
          "一条是政策驱动的效率提升，一条是价格战驱动的规模扩张。前者利好软件与配套，后者只剩头部厂商能扛。",
        ],
      },
    ],
    takeaways: [
      "医药的政策底已现，但业绩底要等到明年一季度。",
      "储能的价格战没有结束，关注现金流而不是出货量。",
    ],
    sourceIds: ["i-32", "i-34", "i-09", "i-06", "i-30"],
  },
  "b-1026w": {
    coverage: "第 43 周 · 10 月 20 日 — 10 月 26 日",
    lead: "这一周五条线索交织：存储涨价、算力考核、固态电池中试、集采落地、汇率走强。它们分别对应供给、政策、技术、支付与流动性——正好是判断明年行业景气的五个变量。",
    sections: [
      {
        title: "供给：存储与设备的涨价共振",
        paragraphs: [
          "NAND 合约价上调 10%–15%[1]，设备招标的国产中标比例接近半数[2]。供给端的收缩与国产化同时发生，是这一周最确定的产业变化。",
        ],
      },
      {
        title: "政策：算力从建设转向运营",
        paragraphs: [
          "智算中心考核加入上架率与利用率[3]；集采与医保谈判同步启动[4]。政策的手从「给钱建」转向「按效果算」，这会改变很多商业模式的估值基础。",
        ],
      },
      {
        title: "技术与支付：两个慢变量",
        paragraphs: [
          "固态电池中试线贯通，420Wh/kg、800 次循环[5]；某创新药企达成 12 亿美元授权[6]。技术突破与支付能力是两条慢变量，短期不改变业绩，但决定 2027 年的竞争格局。",
        ],
      },
      {
        title: "资金：友好但不是主逻辑",
        paragraphs: [
          "9 月社融增量 3.8 万亿元，企业中长期贷款同比多增 3200 亿元[7]；人民币中间价升至 7.05[8]。",
          "资金面友好是加分项，不是主逻辑。它能放大结构性行情，但改变不了供给与需求的相对位置。",
        ],
      },
    ],
    takeaways: [
      "供给端的变化最快，政策端次之，技术与支付最慢；仓位应该按这个顺序排。",
      "汇率走强与社融改善给了一个相对友好的资金环境，但不要把它当成基本面。",
      "下周重点看：存储模组提价能否落地、医保谈判结果、以及设备招标的国产中标率。",
    ],
    sourceIds: ["i-03", "i-13", "i-06", "i-32", "i-26", "i-33", "i-35", "i-36"],
  },
  "b-1023": {
    coverage: "10 月 22 日 08:00 — 10 月 23 日 08:00",
    lead: "储能招标价再创新低，2 小时系统均价跌破 0.5 元/Wh；碳酸锂跌破 7 万元/吨；充电桩利用率回到盈亏平衡线以上。三条消息拼出的是一张「成本下降、规模扩张、盈利分化」的行业图。",
    sections: [
      {
        title: "储能：价格战进入系统集成",
        paragraphs: [
          "本月 12GWh 招标完成，2 小时系统均价 0.48 元/Wh，环比 -7%，央企集采占比过半[1]。",
          "价格战从电芯蔓延到系统集成，二线厂商的现金流会先于报表恶化。行业出清的速度取决于央企集采的付款条件。",
        ],
      },
      {
        title: "锂与充电：成本与利用率的两端",
        paragraphs: [
          "电池级碳酸锂均价跌到 6.85 万元/吨[2]；公共充电桩保有量突破 1400 万台，利用率回升至 6.8%[3]。",
          "成本端下行利好电池厂，利用率跨过盈亏平衡线则可能重启运营商的资本开支。两头同时改善，但受益者不是同一批公司。",
        ],
      },
    ],
    takeaways: [
      "储能的价格战还没见底，先看现金流与回款周期。",
      "充电桩利用率回升是运营商资本开支的前瞻信号。",
    ],
    sourceIds: ["i-30", "i-27", "i-31"],
  },
}

export type Run = {
  id: string
  job: string
  target: string
  status: "成功" | "运行中" | "失败" | "跳过"
  startedAt: string
  duration: string
  detail: string
}

/** 板块的短名与 URL slug：筛选状态要能分享。 */
/** v9 及更早的板块名 → 现行板块；历史 JSON 导入与迁移共用。 */
export const SECTION_ALIASES: Record<string, Section> = {
  宏观与政策: "政策与监管",
  市场与资金: "市场与趋势",
  行业与公司: "公司与产品",
  资本事件: "资本与交易",
  观点与研报: "观点与研究",
}

/** 把任意历史板块名归一到现行板块，认不出来的落到「市场与趋势」。 */
export function normalizeSection(value: string): Section {
  if (SECTIONS.includes(value as Section)) return value as Section
  return SECTION_ALIASES[value] ?? "市场与趋势"
}

export const SECTION_META: Record<Section, { short: string; slug: string }> = {
  政策与监管: { short: "政策", slug: "policy" },
  市场与趋势: { short: "市场", slug: "trend" },
  公司与产品: { short: "公司", slug: "company" },
  资本与交易: { short: "资本", slug: "deal" },
  观点与研究: { short: "观点", slug: "research" },
  风险与异动: { short: "风险", slug: "risk" },
}

export type SectionFilter = Section | "all"

export function sectionBySlug(slug?: string): Section | null {
  const hit = Object.entries(SECTION_META).find(([, meta]) => meta.slug === slug)
  return hit ? (hit[0] as Section) : null
}

export const SECTIONS: Section[] = [
  "政策与监管",
  "市场与趋势",
  "公司与产品",
  "资本与交易",
  "观点与研究",
  "风险与异动",
]

/** 按当前全量情报动态统计，运营看板的板块分布用。 */
/** 读者版日报只展示已发布的一期。 */
export const PUBLISHED_BRIEFS = BRIEFS.filter((brief) => brief.status === "已发布")
