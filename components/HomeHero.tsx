"use client";

import Link from "next/link";
import { ArrowRight } from "./icons";
import Txt from "./Txt";

export default function HomeHero() {
  return (
    <section className="wrap flex flex-col gap-7 pt-7 pb-[72px]">
      <Txt k="home-hero-eyebrow" as="p" className="m-0 font-mono text-sm tracking-[0.08em]" />
      <Txt k="home-hero-headline" as="h1" className="m-0 max-w-[15ch] font-serif text-[clamp(30px,6.4vw,67px)] leading-[1.02] font-medium tracking-[-0.01em]" />
      <Txt k="home-hero-sub" as="p" className="m-0 max-w-[52ch] text-xl leading-[1.65] text-muted" />
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/du-an/" className="btn btn-dark">
          <Txt k="home-hero-cta1" /> <ArrowRight />
        </Link>
        <a href="#lien-he" className="btn">
          <Txt k="home-hero-cta2" />
        </a>
      </div>
    </section>
  );
}
