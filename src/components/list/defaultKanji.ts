import { log } from "@/utils/utils";
import { type Kanji } from "./kanjiStore";

export const DEFAULT_KANJI_VERSION = "0.2.2";

const dedupe = (s: string) => {
  return [...new Set(s)].join("");
};

const l1Kanji = dedupe(`
日月木山川田人口車門
火水金土子女学先生私
一二三四五六七八九十百千万円年
上下中大小本半分力何
明休体好男林森間畑岩
目耳手足雨竹米貝石糸
花茶肉文字物牛馬鳥魚
新古長短高安低暗多少
行来帰食飲見聞読書話買教
朝昼夜晩夕方午前後毎週曜
作泳油海酒待校時言計語飯
宅客室家英薬会今雪雲電売
広店度病疲痛屋国回困開閉
近遠速遅道青晴静寺持荷歌
友父母兄弟姉妹夫妻彼主奥
元気有名親切便利不若早忙
出入乗降着渡通走歩止動働
右左東南北西外内部駅社院
地鉄工場図館公園住所番号
市町村区都府県島京様
練習勉強研究留質問題答宿
政治経済歴史育化理数科医
`);

const l1Extras = dedupe(
  `
富士自動専門電車筑波
利根彼葉歳去実改札峠
鱈鰯体育週語次鼻科天
紙化助鈴佐藤渡辺高橋
井上加藤伊藤喫茶店紅
茶省漢乳焼美温詞形容
意晩御飯様法絵洋招反
欠交舌英和辞典茨城告
難首形声達刻信号続快
仙横浜州関係祖伯叔課
情適当容航郵鼻符婦眼
器泌尿整殿包錠移到労
券`, // TODO page 165+
);

const l2Extras = dedupe(``);

const l2Kanji = dedupe(`
映画写真音楽料組思色白黒赤
起寝遊立座使始終貸借返送
結婚離欠席予定洋式和活
春夏秋冬暑熱寒冷暖温涼天
仕事運転者記議員商業農
良悪正違同適当難次形味
試験面接説果合格受落残念
指折払投打深洗流消決
旅約案準備相談連絡泊特急
線発到交機関局信路故注意
押引割営自由取求願知
台窓具器用服紙辞雑誌
銀資品個価産期々報告
感心情悲泣笑頭覚忘考
伝代呼焼曲脱別集並喜驚
細太重軽狭弱眠苦簡単
空港飛階建設完成費放
位置横向原平野風両橋
老族配術退効民訪顔歯
卒論実調必要類得失礼
増加減変移続過進以美
比反対賛共直表現初
全最無非第的性法律制課`);

const toKanji = (s: string, d: Omit<Kanji, "kanji" | "index">) => {
  return [...new Set(s)]
    .filter((f) => f !== "\n")
    .map<Kanji>((kanji) => ({ ...d, kanji, index: 0 }));
};

type KanjiOverrideStrategy = (p: Kanji, n: Kanji) => Kanji;

export const removeDuplicates = (
  k: Kanji[],
  mergeStrategy: KanjiOverrideStrategy = (p) => p,
) => {
  const retArr = [] as Kanji[];
  for (const kanji of k) {
    const obj = retArr.find((z) => z.kanji === kanji.kanji);
    if (obj) {
      const nObj = mergeStrategy(obj, kanji);
      obj.lvl = nObj.lvl;
      obj.status = nObj.status;
      obj.type = nObj.type;
      obj.index = nObj.index;
    } else {
      retArr.push(kanji);
    }
  }
  return retArr;
};

export const chainStrategies = (
  ...strategies: KanjiOverrideStrategy[]
): KanjiOverrideStrategy => {
  return (a, b) => {
    for (const strategy of strategies) {
      a = strategy(a, b);
    }
    return a;
  };
};

export const OVERRIDE_ALL: KanjiOverrideStrategy = (_, n) => n;
export const OVERRIDE_INDEXES: KanjiOverrideStrategy = (p, n) => ({
  ...p,
  index: n.index,
});
export const OVERRIDE_STATUS: KanjiOverrideStrategy = (p, n) => ({
  ...p,
  status: n.status,
});
export const NO_OVERRIDE: KanjiOverrideStrategy = (p) => p;

const l1Base = toKanji(l1Kanji, { status: "new", type: "base", lvl: 1 });
const l1Extra = toKanji(l1Extras, { status: "new", type: "extra", lvl: 1 });
const l2Base = toKanji(l2Kanji, { status: "new", type: "base", lvl: 2 });
const l2Extra = toKanji(l2Extras, { status: "new", type: "extra", lvl: 2 });

export const DEFAULT_KANJIS = () =>
  removeDuplicates(
    l1Base.concat(l2Base).concat(l1Extra.concat(l2Extra)),
    NO_OVERRIDE,
  )
    .sort((p, n) => p.lvl - n.lvl)
    .map((k, index) => ({ ...k, index })); // prioritize bases over extras

log`lv1,base:${DEFAULT_KANJIS()
  .filter((f) => f.type == "base" && f.lvl === 1)
  .map((k) => k.kanji)}`;

log`lv1,extra:${DEFAULT_KANJIS()
  .filter((f) => f.type == "extra" && f.lvl === 1)
  .map((k) => k.kanji)}`;

log`lv2,base:${DEFAULT_KANJIS()
  .filter((f) => f.type == "base" && f.lvl === 2)
  .map((k) => k.kanji)}`;

log`lv2,extra:${DEFAULT_KANJIS()
  .filter((f) => f.type == "extra" && f.lvl === 2)
  .map((k) => k.kanji)}`;
