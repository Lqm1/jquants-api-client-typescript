/**
 * J-Quants API Client TypeScript - Constants
 *
 * Sector classifications, market segments, and column definitions.
 */

// ============================================================================
// Sector / Market Data (shared V1/V2)
// ============================================================================

/** 17-sector classification: [code, nameJa, nameEn] */
export const SECTOR_17_DATA: readonly [string, string, string][] = [
  ["1", "食品", "FOODS"],
  ["2", "エネルギー資源", "ENERGY RESOURCES"],
  ["3", "建設・資材", "CONSTRUCTION & MATERIALS"],
  ["4", "素材・化学", "RAW MATERIALS & CHEMICALS"],
  ["5", "医薬品", "PHARMACEUTICAL"],
  ["6", "自動車・輸送機", "AUTOMOBILES & TRANSPORTATION EQUIPMEN"],
  ["7", "鉄鋼・非鉄", "STEEL & NONFERROUS METALS"],
  ["8", "機械", "MACHINERY"],
  ["9", "電機・精密", "ELECTRIC APPLIANCES & PRECISION INSTRUMENTS"],
  ["10", "情報通信・サービスその他", "IT & SERVICES, OTHERS "],
  ["11", "電気・ガス", "ELECTRIC POWER & GAS"],
  ["12", "運輸・物流", "TRANSPORTATION & LOGISTICS"],
  ["13", "商社・卸売", "COMMERCIAL & WHOLESALE TRADE"],
  ["14", "小売", "RETAIL TRADE"],
  ["15", "銀行", "BANKS"],
  ["16", "金融（除く銀行）", "FINANCIALS (EX BANKS) "],
  ["17", "不動産", "REAL ESTATE"],
  ["99", "その他", "OTHER"],
];

/** 33-sector classification: [code, nameJa, nameEn, sector17Code] */
export const SECTOR_33_DATA: readonly [string, string, string, string][] = [
  ["0050", "水産・農林業", "Fishery, Agriculture & Forestry", "1"],
  ["1050", "鉱業", "Mining", "2"],
  ["2050", "建設業", "Construction", "3"],
  ["3050", "食料品", "Foods", "1"],
  ["3100", "繊維製品", "Textiles & Apparels", "4"],
  ["3150", "パルプ・紙", "Pulp & Paper", "4"],
  ["3200", "化学", "Chemicals", "4"],
  ["3250", "医薬品", "Pharmaceutical", "5"],
  ["3300", "石油･石炭製品", "Oil & Coal Products", "2"],
  ["3350", "ゴム製品", "Rubber Products", "6"],
  ["3400", "ガラス･土石製品", "Glass & Ceramics Products", "3"],
  ["3450", "鉄鋼", "Iron & Steel", "7"],
  ["3500", "非鉄金属", "Nonferrous Metals", "7"],
  ["3550", "金属製品", "Metal Products", "3"],
  ["3600", "機械", "Machinery", "8"],
  ["3650", "電気機器", "Electric Appliances", "9"],
  ["3700", "輸送用機器", "Transportation Equipment", "6"],
  ["3750", "精密機器", "Precision Instruments", "9"],
  ["3800", "その他製品", "Other Products", "10"],
  ["4050", "電気･ガス業", "Electric Power & Gas", "11"],
  ["5050", "陸運業", "Land Transportation", "12"],
  ["5100", "海運業", "Marine Transportation", "12"],
  ["5150", "空運業", "Air Transportation", "12"],
  ["5200", "倉庫･運輸関連業", "Warehousing & Harbor Transportation Services", "12"],
  ["5250", "情報･通信業", "Information & Communication", "10"],
  ["6050", "卸売業", "Wholesale Trade", "13"],
  ["6100", "小売業", "Retail Trade", "14"],
  ["7050", "銀行業", "Banks", "15"],
  ["7100", "証券､商品先物取引業", "Securities & Commodity Futures", "16"],
  ["7150", "保険業", "Insurance", "16"],
  ["7200", "その他金融業", "Other Financing Business", "16"],
  ["8050", "不動産業", "Real Estate", "17"],
  ["9050", "サービス業", "Services", "10"],
  ["9999", "その他", "Other", "99"],
];

/** Market segment data: [code, nameJa, nameEn] */
export const MARKET_SEGMENT_DATA: readonly [string, string, string][] = [
  ["0101", "東証一部", "1st Section"],
  ["0102", "東証二部", "2nd Section"],
  ["0104", "マザーズ", "Mothers"],
  ["0105", "TOKYO PRO MARKET", "TOKYO PRO MARKET"],
  ["0106", "JASDAQ スタンダード", "JASDAQ Standard"],
  ["0107", "JASDAQ グロース", "JASDAQ Growth"],
  ["0109", "その他", "Others"],
  ["0111", "プライム", "Prime"],
  ["0112", "スタンダード", "Standard"],
  ["0113", "グロース", "Growth"],
];

// ============================================================================
// V2 Column name definitions
// ============================================================================

export const SECTOR_17_COLUMNS_V2 = ["S17", "S17Nm", "S17NmEn"] as const;
export const SECTOR_33_COLUMNS_V2 = ["S33", "S33Nm", "S33NmEn", "S17"] as const;
export const MARKET_SEGMENT_COLUMNS_V2 = ["Mkt", "MktNm", "MktNmEn"] as const;

export const EQ_MASTER_COLUMNS_V2 = [
  "Date", "Code", "CoName", "CoNameEn",
  "S17", "S17Nm", "S33", "S33Nm",
  "ScaleCat", "Mkt", "MktNm", "Mrgn", "MrgnNm",
] as const;

export const EQ_BARS_DAILY_COLUMNS_V2 = [
  "Date", "Code", "O", "H", "L", "C", "UL", "LL", "Vo", "Va",
  "AdjFactor", "AdjO", "AdjH", "AdjL", "AdjC", "AdjVo",
  "MO", "MH", "ML", "MC", "MUL", "MLL", "MVo", "MVa",
  "MAdjO", "MAdjH", "MAdjL", "MAdjC", "MAdjVo",
  "AO", "AH", "AL", "AC", "AUL", "ALL", "AVo", "AVa",
  "AAdjO", "AAdjH", "AAdjL", "AAdjC", "AAdjVo",
] as const;

export const EQ_BARS_MINUTE_COLUMNS_V2 = [
  "Date", "Time", "Code", "O", "H", "L", "C", "Vo", "Va",
] as const;

export const PRICES_PRICES_AM_COLUMNS_V2 = [
  "Date", "Code", "MO", "MH", "ML", "MC", "MVo", "MVa",
] as const;

export const EQ_INVESTOR_TYPES_COLUMNS_V2 = [
  "PubDate", "StDate", "EnDate", "Section",
  "PropSell", "PropBuy", "PropTot", "PropBal",
  "BrkSell", "BrkBuy", "BrkTot", "BrkBal",
  "TotSell", "TotBuy", "TotTot", "TotBal",
  "IndSell", "IndBuy", "IndTot", "IndBal",
  "FrgnSell", "FrgnBuy", "FrgnTot", "FrgnBal",
  "SecCoSell", "SecCoBuy", "SecCoTot", "SecCoBal",
  "InvTrSell", "InvTrBuy", "InvTrTot", "InvTrBal",
  "BusCoSell", "BusCoBuy", "BusCoTot", "BusCoBal",
  "OthCoSell", "OthCoBuy", "OthCoTot", "OthCoBal",
  "InsCoSell", "InsCoBuy", "InsCoTot", "InsCoBal",
  "BankSell", "BankBuy", "BankTot", "BankBal",
  "TrstBnkSell", "TrstBnkBuy", "TrstBnkTot", "TrstBnkBal",
  "OthFinSell", "OthFinBuy", "OthFinTot", "OthFinBal",
] as const;

export const MKT_SHORT_RATIO_COLUMNS_V2 = [
  "Date", "S33", "SellExShortVa", "ShrtWithResVa", "ShrtNoResVa",
] as const;

export const MKT_BREAKDOWN_COLUMNS_V2 = [
  "Date", "Code",
  "LongSellVa", "ShrtNoMrgnVa", "MrgnSellNewVa", "MrgnSellCloseVa",
  "LongBuyVa", "MrgnBuyNewVa", "MrgnBuyCloseVa",
  "LongSellVo", "ShrtNoMrgnVo", "MrgnSellNewVo", "MrgnSellCloseVo",
  "LongBuyVo", "MrgnBuyNewVo", "MrgnBuyCloseVo",
] as const;

export const FIN_SUMMARY_COLUMNS_V2 = [
  "DiscDate", "DiscTime", "Code", "DiscNo", "DocType",
  "CurPerType", "CurPerSt", "CurPerEn", "CurFYSt", "CurFYEn",
  "NxtFYSt", "NxtFYEn",
  "Sales", "OP", "OdP", "NP", "EPS", "DEPS",
  "TA", "Eq", "EqAR", "BPS",
  "CFO", "CFI", "CFF", "CashEq",
  "Div1Q", "Div2Q", "Div3Q", "DivFY", "DivAnn",
  "DivUnit", "DivTotalAnn", "PayoutRatioAnn",
  "FDiv1Q", "FDiv2Q", "FDiv3Q", "FDivFY", "FDivAnn",
  "FDivUnit", "FDivTotalAnn", "FPayoutRatioAnn",
  "NxFDiv1Q", "NxFDiv2Q", "NxFDiv3Q", "NxFDivFY", "NxFDivAnn",
  "NxFDivUnit", "NxFPayoutRatioAnn",
  "FSales2Q", "FOP2Q", "FOdP2Q", "FNP2Q", "FEPS2Q",
  "NxFSales2Q", "NxFOP2Q", "NxFOdP2Q", "NxFNp2Q", "NxFEPS2Q",
  "FSales", "FOP", "FOdP", "FNP", "FEPS",
  "NxFSales", "NxFOP", "NxFOdP", "NxFNp", "NxFEPS",
  "MatChgSub", "SigChgInC", "ChgByASRev", "ChgNoASRev",
  "ChgAcEst", "RetroRst",
  "ShOutFY", "TrShFY", "AvgSh",
  "NCSales", "NCOP", "NCOdP", "NCNP", "NCEPS",
  "NCTA", "NCEq", "NCEqAR", "NCBPS",
  "FNCSales2Q", "FNCOP2Q", "FNCOdP2Q", "FNCNP2Q", "FNCEPS2Q",
  "NxFNCSales2Q", "NxFNCOP2Q", "NxFNCOdP2Q", "NxFNCNP2Q", "NxFNCEPS2Q",
  "FNCSales", "FNCOP", "FNCOdP", "FNCNP", "FNCEPS",
  "NxFNCSales", "NxFNCOP", "NxFNCOdP", "NxFNCNP", "NxFNCEPS",
] as const;

export const BULK_LIST_COLUMNS_V2 = [
  "Key", "Size", "LastModified",
] as const;
