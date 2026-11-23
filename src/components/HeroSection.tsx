import React from 'react';
import { ArrowDownRight, Mail } from 'lucide-react';

interface HeroSectionProps {
  nodeCount: number;
  edgeCount: number;
  classCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  nodeCount,
  edgeCount,
  classCount,
}) => {
  return (
    <section
      id="home"
      className="scroll-mt-20 border-b border-[#201B1D]/10 bg-[#FFFDF9] pt-12 pb-16 sm:pt-16 sm:pb-24"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="mb-4 font-mono text-xs font-medium tracking-wider text-[#8B0029] uppercase">
              고려대학교 노어노문학과 · 디지털인문학 포트폴리오
            </p>
            <h1 className="font-serif text-3xl leading-[1.3] font-bold tracking-tight text-[#201B1D] sm:text-4xl lg:text-[2.65rem]">
              문화와 데이터를 연결하는 디지털 인문학도,{' '}
              <span className="text-[#8B0029]">심성민</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5C5255] sm:text-[1.0625rem]">
              인문학적 질문에서 출발해 문화 현장의 흩어진 기록을 구조화하고,
              지식그래프와 웹 시각화를 통해 맥락과 변화의 흐름을 읽어냅니다.
              노어노문학 전공 기반 위에 인문학 콘텐츠와 문화 데이터 분석을
              탐구하고 있습니다.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#project"
                className="inline-flex items-center gap-2 rounded-xl bg-[#8B0029] px-5 py-3 text-sm font-semibold text-[#FFFDF9] shadow-sm transition-colors hover:bg-[#B10F3C]"
              >
                프로젝트 보기
                <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-xl border border-[#201B1D]/20 bg-[#FFFDF9] px-5 py-3 text-sm font-semibold text-[#201B1D] transition-colors hover:border-[#8B0029]/40 hover:bg-[#F5EEE5]"
              >
                <Mail className="h-4 w-4 text-[#8B0029]" aria-hidden="true" />
                연락하기
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <figure className="overflow-hidden rounded-[24px] border border-[#201B1D]/12 bg-[#F5EEE5] p-3 shadow-sm">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-[#8B0029]/15 bg-[#FFFDF9]">
                <img
                  src="./assets/profile-placeholder.svg"
                  alt="심성민 프로필 사진 플레이스홀더"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-2.5 flex items-center justify-between px-1.5 text-xs text-[#5C5255]">
                <span>심성민 (Sungmin Sim)</span>
                <span className="font-mono text-[11px] text-[#8B0029]">
                  4:3 프로필 이미지 준비 중
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="mt-12 rounded-[24px] border border-[#201B1D]/12 bg-[#F5EEE5]/75 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#5C5255]">
                <span className="font-semibold text-[#8B0029]">대표 연구 프로젝트</span>
                <span aria-hidden="true">·</span>
                <span>고려대학교 「디지털인문학응용」</span>
                <span aria-hidden="true">·</span>
                <span>2026년 9월–12월</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#201B1D]">진행 중</span>
              </div>
              <h2 className="mt-2 font-serif text-xl font-bold text-[#201B1D] sm:text-2xl">
                2025–2026 고려대학교 석탑대동제 지식그래프 분석
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5255]">
                연도별 축제 책자와 공개 자료에 흩어져 있던 무대 공연 및 부스 운영
                기록을 Neo4j 지식그래프로 구축해 참여 주체의 구성과 2개년 변화를
                탐색합니다.
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-3 divide-x divide-[#201B1D]/12 rounded-2xl border border-[#201B1D]/10 bg-[#FFFDF9] py-4">
              <div className="px-4 text-center sm:px-6">
                <div className="tabular-nums font-serif text-2xl font-bold text-[#8B0029] sm:text-3xl">
                  {nodeCount}
                  <span className="ml-0.5 text-sm font-medium text-[#201B1D]">개</span>
                </div>
                <div className="mt-1 text-xs font-medium text-[#5C5255]">노드</div>
              </div>
              <div className="px-4 text-center sm:px-6">
                <div className="tabular-nums font-serif text-2xl font-bold text-[#8B0029] sm:text-3xl">
                  {edgeCount}
                  <span className="ml-0.5 text-sm font-medium text-[#201B1D]">개</span>
                </div>
                <div className="mt-1 text-xs font-medium text-[#5C5255]">관계</div>
              </div>
              <div className="px-4 text-center sm:px-6">
                <div className="tabular-nums font-serif text-2xl font-bold text-[#8B0029] sm:text-3xl">
                  {classCount}
                  <span className="ml-0.5 text-sm font-medium text-[#201B1D]">종</span>
                </div>
                <div className="mt-1 text-xs font-medium text-[#5C5255]">노드 클래스</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#201B1D]/10 pt-4 text-sm">
            <a
              href="#knowledge-graph"
              className="inline-flex items-center gap-1.5 font-semibold text-[#8B0029] transition-colors hover:text-[#B10F3C]"
            >
              인터랙티브 지식그래프 바로 탐색하기
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#project"
              className="font-medium text-[#5C5255] transition-colors hover:text-[#201B1D]"
            >
              연구 설계 및 진행 과정 보기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
