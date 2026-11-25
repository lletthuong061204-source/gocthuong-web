import remote from "./remote.json";

// Editable text on each page. The CMS ("Nội dung trang") saves overrides to Firestore
// settings/pages; scripts/sync.ts exports them to remote.json at build time.
// Anything left empty in the CMS falls back to the default written here.

export type Lang = "vi" | "en" | "zh";
export type TextStyle = {
  font?: "serif" | "sans" | "mono";
  /** Percent of the design size: 80–160. */
  size?: number;
  weight?: 400 | 500 | 600 | 700;
  italic?: boolean;
};
export type FieldValue = { vi?: string; en?: string; zh?: string; style?: TextStyle };
export type FieldDef = { key: string; label: string; vi: string; en?: string; zh?: string; multiline?: boolean; hint?: string };
export type PageDef = { id: string; label: string; path: string; groups: { label: string; fields: FieldDef[] }[] };

export const pageDefs: PageDef[] = [
  {
    id: "home",
    label: "Trang chủ",
    path: "/",
    groups: [
      {
        label: "Phần đầu (hero)",
        fields: [
          { key: "home-hero-eyebrow", label: "Nhãn nhỏ phía trên", vi: "BUSINESS ANALYST · IT & AI · EN / 中文", en: "BUSINESS ANALYST · IT & AI · EN / 中文", zh: "业务分析师 · IT 与 AI · EN / 中文" },
          { key: "home-hero-headline", label: "Tiêu đề lớn", vi: "Biến bài toán kinh doanh thành giải pháp AI rõ ràng.", en: "Turning business problems into clear AI solutions.", zh: "把业务问题变成清晰的 AI 方案。", multiline: true },
          { key: "home-hero-sub", label: "Câu giới thiệu", vi: "Mình là Thương — BA mảng IT/AI, đang học tiếng Anh và tiếng Trung với mục tiêu trở thành phiên dịch viên.", en: "I'm Thương — a BA in IT/AI, learning English and Chinese on the way to becoming an interpreter.", zh: "我是 Thương，IT/AI 领域的业务分析师，正在学习英语和中文，目标是成为口译员。", multiline: true },
          { key: "home-hero-cta1", label: "Nút chính", vi: "Xem dự án", en: "View projects", zh: "查看项目" },
          { key: "home-hero-cta2", label: "Nút phụ", vi: "Liên hệ", en: "Contact", zh: "联系我" },
        ],
      },
      {
        label: "Dự án nổi bật",
        fields: [
          { key: "home-projects-title", label: "Tiêu đề", vi: "Dự án nổi bật", en: "Featured projects", zh: "精选项目" },
          { key: "home-projects-link", label: "Link xem tất cả", vi: "TẤT CẢ DỰ ÁN →", en: "ALL PROJECTS →", zh: "全部项目 →" },
        ],
      },
      {
        label: "Hành trình ngôn ngữ",
        fields: [
          { key: "home-journey-title", label: "Tiêu đề", vi: "Hành trình\nngôn ngữ", en: "Language\njourney", zh: "语言之旅", multiline: true, hint: "Xuống dòng để ngắt tiêu đề thành 2 dòng." },
          { key: "home-journey-sub", label: "Mô tả", vi: "Mục tiêu: phiên dịch cho các cuộc họp công nghệ và kinh doanh.", en: "Goal: interpreting for tech and business meetings.", zh: "目标：为科技和商务会议做口译。", multiline: true },
          { key: "home-journey-cta", label: "Nút", vi: "Xem lộ trình & sản phẩm →", en: "See roadmap & samples →", zh: "查看路线和作品 →" },
        ],
      },
      {
        label: "Bài viết mới",
        fields: [
          { key: "home-posts-title", label: "Tiêu đề", vi: "Bài viết mới", en: "Latest writing", zh: "最新文章" },
          { key: "home-posts-link", label: "Link xem tất cả", vi: "TẤT CẢ BÀI VIẾT →", en: "ALL POSTS →", zh: "全部文章 →" },
        ],
      },
      {
        label: "Liên hệ (cuối trang)",
        fields: [
          { key: "home-contact-title", label: "Tiêu đề", vi: "Cùng làm việc nhé.", en: "Let's work together.", zh: "一起合作吧。" },
          { key: "home-contact-sub", label: "Mô tả", vi: "Dự án BA/AI, tài liệu song ngữ, hoặc một buổi cà phê.", en: "BA/AI projects, bilingual documents, or just a coffee.", zh: "BA/AI 项目、双语文档，或者一起喝杯咖啡。", multiline: true },
          { key: "home-contact-cv", label: "Nút tải CV", vi: "Tải CV", en: "Download CV", zh: "下载简历" },
        ],
      },
    ],
  },
  {
    id: "projects",
    label: "Dự án",
    path: "/du-an/",
    groups: [
      {
        label: "Phần đầu trang",
        fields: [
          { key: "projects-eyebrow", label: "Nhãn nhỏ", vi: "● CASE STUDY BA & AI", en: "● BA & AI CASE STUDIES", zh: "● BA 与 AI 案例" },
          { key: "projects-title", label: "Tiêu đề", vi: "Dự án", en: "Projects", zh: "项目" },
          { key: "projects-sub", label: "Mô tả", vi: "Mỗi dự án: vấn đề, cách làm, kết quả đo được.", en: "Each project: the problem, the approach, measurable results.", zh: "每个项目：问题、做法、可衡量的结果。", multiline: true },
        ],
      },
    ],
  },
  {
    id: "posts",
    label: "Bài viết",
    path: "/bai-viet/",
    groups: [
      {
        label: "Phần đầu trang",
        fields: [
          { key: "posts-eyebrow", label: "Nhãn nhỏ", vi: "GHI CHÉP · BA · AI · NGÔN NGỮ", en: "NOTES · BA · AI · LANGUAGES", zh: "笔记 · BA · AI · 语言" },
          { key: "posts-title", label: "Tiêu đề", vi: "Bài viết", en: "Writing", zh: "文章" },
          { key: "posts-sub", label: "Mô tả", vi: "Bài học từ công việc BA, thử nghiệm AI và hành trình học ngôn ngữ.", en: "Lessons from BA work, AI experiments and learning languages.", zh: "来自 BA 工作、AI 实验和语言学习的心得。", multiline: true },
        ],
      },
    ],
  },
  {
    id: "connect",
    label: "Kết nối",
    path: "/ket-noi/",
    groups: [
      {
        label: "Phần đầu trang",
        fields: [
          { key: "connect-title", label: "Tiêu đề", vi: "Tài nguyên chia sẻ", en: "Shared resources", zh: "共享资源" },
          { key: "connect-sub", label: "Mô tả", vi: "Link và tài liệu chọn lọc cho BA, AI và người học ngôn ngữ.", en: "Hand-picked links for BAs, AI and language learners.", zh: "为 BA、AI 和语言学习者精选的链接与资料。", multiline: true },
        ],
      },
    ],
  },
  {
    id: "journey",
    label: "Hành trình ngôn ngữ",
    path: "/hanh-trinh-ngon-ngu/",
    groups: [
      {
        label: "Phần đầu trang",
        fields: [
          { key: "journey-eyebrow", label: "Nhãn nhỏ", vi: "● VI · EN · 中文 — TỪ BA ĐẾN PHIÊN DỊCH", en: "● VI · EN · 中文 — FROM BA TO INTERPRETER", zh: "● VI · EN · 中文 — 从 BA 到口译" },
          { key: "journey-title", label: "Tiêu đề", vi: "BA phiên dịch giữa kinh doanh và công nghệ. Mình muốn phiên dịch cả giữa con người.", en: "A BA translates between business and tech. I want to translate between people too.", zh: "BA 在业务与技术之间翻译。我也想在人与人之间翻译。", multiline: true },
          { key: "journey-sub", label: "Mô tả", vi: "Lộ trình, tiến độ thật và sản phẩm thật — cập nhật mỗi khi mình đạt một mốc mới.", en: "Roadmap, real progress and real samples — updated at every new milestone.", zh: "路线、真实进度和真实作品——每达到一个新里程碑就更新。", multiline: true },
        ],
      },
      {
        label: "Khối liên hệ cuối trang",
        fields: [
          { key: "journey-cta-title", label: "Tiêu đề", vi: "Cần dịch tài liệu IT?", en: "Need IT documents translated?", zh: "需要翻译 IT 文档？" },
          { key: "journey-cta-sub", label: "Mô tả", vi: "BRD, user story, tài liệu sản phẩm · EN ⇄ VI ⇄ 中文", en: "BRDs, user stories, product docs · EN ⇄ VI ⇄ 中文", zh: "BRD、用户故事、产品文档 · EN ⇄ VI ⇄ 中文" },
        ],
      },
    ],
  },
];

export const fieldDefs: Record<string, FieldDef> = Object.fromEntries(pageDefs.flatMap((p) => p.groups.flatMap((g) => g.fields)).map((f) => [f.key, f]));

/** Overrides saved in the CMS (published at build time). */
export const pageOverrides: Record<string, FieldValue> = (remote as { pages?: { fields?: Record<string, FieldValue> } }).pages?.fields ?? {};

/** Text for a field in a language: CMS text → default for that language → CMS Vietnamese → default Vietnamese. */
export function fieldText(key: string, lang: Lang, overrides: Record<string, FieldValue> = pageOverrides): string {
  const def = fieldDefs[key];
  const o = overrides[key];
  const pick = (v?: string) => (v && v.trim() ? v : undefined);
  return pick(o?.[lang]) ?? pick(lang === "vi" ? undefined : def?.[lang]) ?? pick(o?.vi) ?? def?.vi ?? "";
}

export const fieldStyle = (key: string, overrides: Record<string, FieldValue> = pageOverrides): TextStyle | undefined => overrides[key]?.style;
