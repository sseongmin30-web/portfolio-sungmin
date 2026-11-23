import React from 'react';
import { ExternalLink, Mail } from 'lucide-react';

const WIKI_URL =
  'https://dh.aks.ac.kr/~kimseoyun/wiki/index.php/%EC%82%AC%EC%9A%A9%EC%9E%90:%EC%8B%AC%EC%84%B1%EB%AF%BC';

const PROFILE_ROWS: {
  label: string;
  value: React.ReactNode;
}[] = [
  {
    label: '이름',
    value: (
      <span>
        심성민 <span className="text-[#5C5255]">· Sungmin Sim</span>
      </span>
    ),
  },
  {
    label: '학과',
    value: '고려대학교 노어노문학과',
  },
  {
    label: '입학연도',
    value: <span className="tabular-nums">2023년</span>,
  },
  {
    label: '관심 분야',
    value: '인문학 콘텐츠 · 디지털인문학 · 문화 데이터',
  },
  {
    label: '이메일',
    value: (
      <a
        href="mailto:sseongmin30@gmail.com"
        className="inline-flex items-center gap-1.5 font-medium text-[#8B0029] underline decoration-[#8B0029]/30 underline-offset-4 transition-colors hover:text-[#B10F3C]"
      >
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        sseongmin30@gmail.com
      </a>
    ),
  },
  {
    label: '자기소개 위키',
    value: (
      <a
        href={WIKI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-[#8B0029] underline decoration-[#8B0029]/30 underline-offset-4 transition-colors hover:text-[#B10F3C]"
      >
        디지털인문학 개인 위키 페이지 열기
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    ),
  },
];

export const AboutSection: React.FC = () => {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-b border-[#201B1D]/10 bg-[#F5EEE5]/55 py-16 sm:py-22"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029] uppercase">
            About
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-[#201B1D] sm:text-3xl">
            자기소개
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5C5255] sm:text-base">
            텍스트와 문화 현상을 데이터 구조로 옮기고, 시각화 및 온톨로지
            관점에서 인문학적 해석의 폭을 넓히는 작업을 지향합니다.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <figure className="overflow-hidden rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-3 shadow-sm">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-[#8B0029]/15 bg-[#F5EEE5]">
                <img
                  src="./assets/profile-placeholder.svg"
                  alt="심성민 자기소개 4:3 프로필 플레이스홀더"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-2.5 flex items-center justify-between px-1.5 text-xs text-[#5C5255]">
                <span>고려대학교 노어노문학과 23학번</span>
                <span className="font-mono text-[11px] text-[#8B0029]">
                  프로필 사진 준비 중
                </span>
              </figcaption>
            </figure>
          </div>

          <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-6 shadow-sm sm:p-8 lg:col-span-7">
            <h3 className="font-serif text-lg font-bold text-[#201B1D]">
              연구자 기본 정보
            </h3>
            <dl className="mt-4 divide-y divide-[#201B1D]/10 border-t border-[#201B1D]/10">
              {PROFILE_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1.5 py-3.5 sm:grid-cols-3 sm:gap-4"
                >
                  <dt className="text-sm font-semibold text-[#5C5255]">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-medium text-[#201B1D] sm:col-span-2">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};
