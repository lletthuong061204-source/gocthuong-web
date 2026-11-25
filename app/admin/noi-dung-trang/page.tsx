"use client";

import { useEffect, useMemo, useState } from "react";
import { cms } from "@/lib/cms";
import { Loading, PageHead, friendly } from "@/components/admin/ui";
import { useToast } from "@/components/Toast";
import { renderInline, styleToCss } from "@/components/Txt";
import { fieldText, pageDefs, type FieldDef, type FieldValue, type Lang, type TextStyle } from "@/content/pages";

const LANG_TABS: { id: Lang; label: string }[] = [
  { id: "vi", label: "VI" },
  { id: "en", label: "EN" },
  { id: "zh", label: "中文" },
];
const SIZES = [80, 90, 100, 110, 125, 140, 160];

const clean = (f: Record<string, FieldValue>) => {
  const out: Record<string, FieldValue> = {};
  for (const [k, v] of Object.entries(f)) {
    const x: FieldValue = {};
    (["vi", "en", "zh"] as const).forEach((l) => {
      if (v[l]?.trim()) x[l] = v[l];
    });
    const s = v.style ?? {};
    const st: TextStyle = {};
    if (s.font) st.font = s.font;
    if (s.size && s.size !== 100) st.size = s.size;
    if (s.weight) st.weight = s.weight;
    if (s.italic) st.italic = true;
    if (Object.keys(st).length) x.style = st;
    if (Object.keys(x).length) out[k] = x;
  }
  return out;
};

function FieldEditor({ def, lang, value, onChange }: { def: FieldDef; lang: Lang; value: FieldValue; onChange: (v: FieldValue) => void }) {
  const s = value.style ?? {};
  const setStyle = (p: Partial<TextStyle>) => onChange({ ...value, style: { ...s, ...p } });
  const placeholder = fieldText(def.key, lang, {});
  const current = value[lang] ?? "";
  const changed = Boolean(value.vi || value.en || value.zh || value.style);
  const preview = fieldText(def.key, lang, { [def.key]: value });
  const inputId = `f-${def.key}-${lang}`;

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold">{def.label}</label>
        {changed && (
          <button type="button" onClick={() => onChange({})} className="cursor-pointer border-0 bg-transparent p-0 text-xs text-muted underline underline-offset-4">
            Khôi phục mặc định
          </button>
        )}
      </div>
      {def.multiline ? (
        <textarea id={inputId} className="field" rows={3} value={current} placeholder={placeholder} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} lang={lang === "zh" ? "zh" : undefined} />
      ) : (
        <input id={inputId} className="field" value={current} placeholder={placeholder} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} lang={lang === "zh" ? "zh" : undefined} />
      )}
      {def.hint && <span className="text-xs text-muted">{def.hint}</span>}

      <div role="group" aria-label={`Định dạng: ${def.label}`} className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1.5 text-muted">
          Phông
          <select className="field !h-9 !w-auto !py-0 text-sm" value={s.font ?? ""} onChange={(e) => setStyle({ font: (e.target.value || undefined) as TextStyle["font"] })}>
            <option value="">Mặc định</option>
            <option value="serif">Có chân (Cormorant)</option>
            <option value="sans">Không chân (Be Vietnam Pro)</option>
            <option value="mono">Đơn cách (JetBrains Mono)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          Cỡ chữ
          <select className="field !h-9 !w-auto !py-0 text-sm" value={s.size ?? 100} onChange={(e) => setStyle({ size: Number(e.target.value) })}>
            {SIZES.map((n) => <option key={n} value={n}>{n === 100 ? "Mặc định" : `${n}%`}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          Độ đậm
          <select className="field !h-9 !w-auto !py-0 text-sm" value={s.weight ?? ""} onChange={(e) => setStyle({ weight: (Number(e.target.value) || undefined) as TextStyle["weight"] })}>
            <option value="">Mặc định</option>
            <option value="400">Thường</option>
            <option value="500">Vừa</option>
            <option value="600">Đậm</option>
            <option value="700">Rất đậm</option>
          </select>
        </label>
        <button
          type="button"
          aria-pressed={!!s.italic}
          onClick={() => setStyle({ italic: !s.italic })}
          className={`h-9 min-w-11 cursor-pointer rounded-lg border px-3 font-serif text-lg italic ${s.italic ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}
        >
          <span className="sr-only">Nghiêng</span>
          <span aria-hidden="true">I</span>
        </button>
      </div>

      <div className="rounded-xl bg-[#FAFAFA] px-4 py-3">
        <span className="mb-1 block font-mono text-[11px] tracking-[0.08em] text-muted">XEM TRƯỚC</span>
        <span className="block text-lg leading-snug" lang={lang === "zh" ? "zh" : undefined}>
          <span style={styleToCss(s)}>{renderInline(preview)}</span>
        </span>
      </div>
    </div>
  );
}

export default function AdminPageText() {
  const [saved, setSaved] = useState<Record<string, FieldValue> | null>(null);
  const [draft, setDraft] = useState<Record<string, FieldValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [pageId, setPageId] = useState(pageDefs[0].id);
  const [lang, setLang] = useState<Lang>("vi");
  const [busy, setBusy] = useState(false);
  const { flash, node } = useToast();

  useEffect(() => {
    cms.pages
      .get()
      .then((f) => {
        setSaved(f);
        setDraft(f);
      })
      .catch((e) => setError(friendly(e)));
  }, []);

  const dirty = useMemo(() => saved !== null && JSON.stringify(clean(draft)) !== JSON.stringify(clean(saved)), [draft, saved]);

  if (!saved) return <Loading error={error} />;
  const page = pageDefs.find((p) => p.id === pageId)!;

  const save = async () => {
    setBusy(true);
    try {
      const next = clean(draft);
      await cms.pages.save(next, page.label);
      setSaved(next);
      setDraft(next);
      flash("Đã lưu — site sẽ cập nhật trong ~15 phút");
    } catch (e) {
      flash(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1160px] pb-24">
      <PageHead
        title="Nội dung trang"
        sub="Sửa chữ và định dạng trên từng trang. Để trống một ô thì site dùng chữ mặc định (chữ mờ trong ô)."
        action={
          <a href={page.path} target="_blank" rel="noopener" className="btn btn-sm h-11 text-sm">
            Xem trang ↗
          </a>
        }
      />

      <div className="flex flex-wrap items-start gap-5">
        <nav aria-label="Chọn trang" className="flex flex-[0_0_220px] flex-col gap-1 max-md:flex-auto max-md:flex-row max-md:overflow-x-auto">
          {pageDefs.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === pageId}
              onClick={() => setPageId(p.id)}
              className={`h-11 shrink-0 cursor-pointer rounded-[10px] border-0 px-4 text-left text-base ${p.id === pageId ? "bg-[#EAEAEA] font-medium" : "bg-transparent"}`}
            >
              {p.label}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Ngôn ngữ" className="flex rounded-xl bg-[#EDEDED] p-1">
              {LANG_TABS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={lang === l.id}
                  onClick={() => setLang(l.id)}
                  className={`h-10 min-w-14 cursor-pointer rounded-[9px] border-0 px-4 font-mono text-sm ${lang === l.id ? "bg-white font-semibold shadow-sm" : "bg-transparent text-muted"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">Viết <b>**chữ đậm**</b> hoặc <i>*chữ nghiêng*</i> ngay trong câu. Định dạng phông, cỡ chữ áp dụng cho mọi ngôn ngữ.</span>
          </div>

          {page.groups.map((g) => (
            <section key={g.label} className="card flex flex-col gap-4 p-6">
              <h2 className="m-0 text-lg font-semibold">{g.label}</h2>
              {g.fields.map((f) => (
                <FieldEditor key={f.key} def={f} lang={lang} value={draft[f.key] ?? {}} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
              ))}
            </section>
          ))}
        </div>
      </div>

      {dirty && (
        <div role="region" aria-label="Thay đổi chưa lưu" className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(640px,calc(100%-32px))] flex-wrap items-center gap-3 rounded-2xl bg-ink py-3 pr-3 pl-5 text-white shadow-xl">
          <span className="mr-auto text-sm">Bạn có thay đổi chưa lưu</span>
          <button type="button" onClick={() => setDraft(saved)} className="h-10 cursor-pointer rounded-full border border-white bg-transparent px-4 text-sm text-white">Huỷ</button>
          <button type="button" disabled={busy} onClick={save} className="h-10 cursor-pointer rounded-full border-0 bg-white px-5 text-sm font-semibold text-ink">
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      )}
      {node}
    </div>
  );
}
