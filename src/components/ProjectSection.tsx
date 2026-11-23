import React from 'react';
import { CheckCircle2, Clock, CircleDot } from 'lucide-react';
import {
  NODE_CLASSES,
  NODE_CLASS_META,
  ParsedKnowledgeGraph,
  RELATION_TYPE_META,
  RelationType,
} from '../types/graph';
import { KnowledgeGraph } from './KnowledgeGraph';

interface ProjectSectionProps {
  graph: ParsedKnowledgeGraph | null;
  loading: boolean;
  error: string | null;
  onUploadJson: (raw: unknown, fileName: string) => void;
  sourceLabel: string;
}

const RESEARCH_QUESTIONS = [
  {
    num: '01',
    text: '최근 2개년 석탑대동제의 무대 공연에는 어떤 종류의 연예인들이 섭외되었는가?',
  },
  {
    num: '02',
    text: '최근 2개년 석탑대동제의 무대 공연에는 어떤 종류의 학생단체들이 참여했는가?',
  },
  {
    num: '03',
    text: '최근 2개년 석탑대동제의 부스에는 어떤 조직이 참여하였으며, 산업군 구성은 어떻게 달라졌는가?',
  },
  {
    num: '04',
    text: '최근 2개년 석탑대동제의 부스에는 어떤 학생참여주체가 참여하였는가?',
  },
];

const KEY_ATTRIBUTES: { key: string; desc: string }[] = [
  { key: 'year', desc: '축제 개최 연도 (2025, 2026)' },
  { key: 'genre', desc: '초청 연예인의 음악·공연 장르 분류' },
  { key: 'industry', desc: '외부 참여 조직의 산업군 구분' },
  { key: 'orgType', desc: '학생참여주체의 소속 및 단체 유형' },
  { key: 'participationType', desc: '학생참여주체의 축제 참여 방식(공연/부스)' },
];

type StepStatus = '완료' | '진행 중' | '예정';

const TIMELINE_STEPS: {
  step: number;
  title: string;
  status: StepStatus;
  detail: string;
}[] = [
  {
    step: 1,
    title: '기획 및 데이터 모델 설계',
    status: '완료',
    detail: '축제·일자·참여 주체 간 5종 노드와 3종 관계 스키마 확정',
  },
  {
    step: 2,
    title: '자료 수집 및 정리',
    status: '완료',
    detail: '2025 KUdyssey·2026 Kulimax 공식 책자 및 공개 자료 취합',
  },
  {
    step: 3,
    title: 'Neo4j 데이터 구축',
    status: '완료',
    detail: '노드 150개·관계 242개 그래프 데이터베이스 적재 완료',
  },
  {
    step: 4,
    title: 'Cypher 질의 작성·검증',
    status: '완료',
    detail: '4개 핵심 연구 질문을 중심으로 Cypher 탐색 및 정합성 확인',
  },
  {
    step: 5,
    title: '분석 및 인문학적 해석',
    status: '진행 중',
    detail: '2개년 라인업·학생 참여·산업군 변화에 대한 인문학적 맥락화',
  },
  {
    step: 6,
    title: '웹 시각화',
    status: '진행 중',
    detail: '정적 웹 환경에서 동작하는 인터랙티브 지식그래프 탐색기 구현',
  },
  {
    step: 7,
    title: '최종 보고',
    status: '예정',
    detail: '최종 연구 보고서 및 아카이브 결과 발표',
  },
];

const MY_ROLES = [
  '2025·2026년 연예인 라인업 조사 및 데이터 정리',
  '연예인 섭외 유형·장르 분류',
  'Cypher 질의 작성 및 Neo4j 결과 검증',
  '연예인 데이터를 중심으로 한 인문학적 결과 해석',
  '프로젝트 홈페이지 제작',
];

const TOOLS = ['Neo4j', 'Cypher', 'Google Sheets', 'Google Docs', 'ChatGPT'];

const SOURCES = [
  '2025 KUdyssey 공식 책자',
  '2026 Kulimax 공식 책자',
  '석탑대동제 공식 SNS 및 참여 조직 공개 자료',
  '팀 Google Sheets',
  'Neo4j 지식그래프',
];

export const ProjectSection: React.FC<ProjectSectionProps> = ({
  graph,
  loading,
  error,
  onUploadJson,
  sourceLabel,
}) => {
  return (
    <section id="project" className="scroll-mt-20 bg-[#FFFDF9] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl space-y-20 px-5 sm:px-8">
        {/* 4-1. 프로젝트 소개 */}
        <div>
          <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029] uppercase">
            Featured Research Project
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="tabular-nums rounded-md border border-[#201B1D]/15 bg-[#F5EEE5] px-2.5 py-1 text-xs font-medium text-[#201B1D]">
              2026년 9월–12월
            </span>
            <span className="rounded-md border border-[#201B1D]/15 bg-[#F5EEE5] px-2.5 py-1 text-xs font-medium text-[#201B1D]">
              4인 팀 프로젝트
            </span>
            <span className="rounded-md border border-[#201B1D]/15 bg-[#F5EEE5] px-2.5 py-1 text-xs font-medium text-[#201B1D]">
              고려대학교 「디지털인문학응용」
            </span>
            <span className="rounded-md border border-[#8B0029]/25 bg-[#8B0029]/8 px-2.5 py-1 text-xs font-semibold text-[#8B0029]">
              진행 중
            </span>
          </div>

          <h2 className="mt-4 font-serif text-3xl leading-tight font-bold text-[#201B1D] sm:text-4xl">
            2025–2026 고려대학교 석탑대동제 지식그래프 분석
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5C5255]">
            2025년(KUdyssey)과 2026년(Kulimax) 고려대학교 석탑대동제의 무대 공연과
            부스 운영 참여 데이터를 Neo4j 지식그래프로 구조화하고, 연도별·일자별
            참여 구성을 탐색할 수 있도록 구축한 디지털인문학 연구 프로젝트입니다.
          </p>
        </div>

        {/* 4-2. 연구 배경 및 문제의식 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
                01 / RESEARCH BACKGROUND
              </p>
              <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
                연구 배경 및 문제의식
              </h3>
            </div>
            <div className="space-y-4 text-[15px] leading-relaxed text-[#201B1D] lg:col-span-8">
              <p>
                대학 축제는 무대 공연과 학생 자치 활동, 외부 기업 및 기관의 홍보
                프로그램이 한 시공간에 교차하며 결합되는 복합 문화 행사입니다.
                그러나 축제를 둘러싼 공식 기록은 해마다 제작되는 책자와 SNS 공지,
                개별 홍보 게시물 등에 흩어져 있어 연도별 전체 구성을 입체적으로
                비교하기 어렵습니다.
              </p>
              <p className="text-[#5C5255]">
                본 연구는 이처럼 파편화된 축제 기록을{' '}
                <strong className="font-semibold text-[#201B1D]">
                  축제–일자–참여 주체
                </strong>
                의 관계망으로 구조화함으로써, 단순한 행사 일정 나열을 넘어 참여
                주체의 분포와 연도별 성격 변화가 한눈에 드러나는 데이터 기반 탐색
                환경을 구축하고자 합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 4-3. 핵심 질문 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
                02 / RESEARCH QUESTIONS
              </p>
              <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
                핵심 질문
              </h3>
            </div>
            <p className="text-xs text-[#5C5255]">
              무대 공연과 부스 운영을 아우르는 4가지 분석 질문
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {RESEARCH_QUESTIONS.map((q) => (
              <div
                key={q.num}
                className="rounded-[22px] border border-[#201B1D]/12 bg-[#F5EEE5]/60 p-6 transition-colors hover:border-[#8B0029]/30"
              >
                <div className="tabular-nums font-mono text-xs font-semibold text-[#8B0029]">
                  Q{q.num}
                </div>
                <p className="mt-2.5 text-[15px] leading-relaxed font-medium text-[#201B1D]">
                  {q.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 4-4. 데이터 모델 설계 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="mb-8">
            <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
              03 / DATA MODEL
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
              데이터 모델 설계
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[#5C5255]">
              축제와 일자를 중심 축으로 두고, 무대 공연과 부스 운영이라는 두 가지
              참여 양상을 5종 노드 클래스와 3종 관계 유형으로 모델링했습니다.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Node Classes */}
            <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-6 sm:p-7">
              <div className="flex items-center justify-between border-b border-[#201B1D]/10 pb-3.5">
                <h4 className="font-serif text-lg font-bold text-[#201B1D]">
                  노드 클래스 5종
                </h4>
                <span className="tabular-nums font-mono text-xs text-[#8B0029]">
                  총 {graph?.nodes.length ?? 150}개 노드
                </span>
              </div>
              <ul className="mt-4 divide-y divide-[#201B1D]/8">
                {NODE_CLASSES.map((cls) => {
                  const meta = NODE_CLASS_META[cls];
                  const count = graph?.classCounts[cls] ?? 0;
                  return (
                    <li
                      key={cls}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-[#201B1D]/10"
                          style={{ backgroundColor: meta.color }}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="text-sm font-bold text-[#201B1D]">
                            {cls}
                          </div>
                          <div className="mt-0.5 text-xs text-[#5C5255]">
                            {meta.description}
                          </div>
                        </div>
                      </div>
                      <span className="tabular-nums shrink-0 font-mono text-xs font-semibold text-[#5C5255]">
                        {count}개
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Relation Types & Key Attributes */}
            <div className="flex flex-col gap-6">
              <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-6 sm:p-7">
                <div className="flex items-center justify-between border-b border-[#201B1D]/10 pb-3.5">
                  <h4 className="font-serif text-lg font-bold text-[#201B1D]">
                    관계 유형 3종
                  </h4>
                  <span className="tabular-nums font-mono text-xs text-[#8B0029]">
                    총 {graph?.edges.length ?? 242}개 관계
                  </span>
                </div>
                <ul className="mt-4 space-y-3.5">
                  {(Object.keys(RELATION_TYPE_META) as RelationType[]).map(
                    (relType) => {
                      const meta = RELATION_TYPE_META[relType];
                      const count = graph?.relationCounts[relType] ?? 0;
                      return (
                        <li
                          key={relType}
                          className="rounded-xl border border-[#201B1D]/10 bg-[#F5EEE5]/50 p-3.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#8B0029]">
                              {relType}
                            </span>
                            <span className="tabular-nums font-mono text-[11px] font-medium text-[#5C5255]">
                              {meta.label} · {count}건
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#5C5255]">
                            {meta.summary}
                          </p>
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>

              <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#F5EEE5]/65 p-6 sm:p-7">
                <h4 className="font-serif text-lg font-bold text-[#201B1D]">
                  주요 속성 (Properties)
                </h4>
                <dl className="mt-3 divide-y divide-[#201B1D]/8">
                  {KEY_ATTRIBUTES.map((attr) => (
                    <div
                      key={attr.key}
                      className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <dt className="font-mono text-xs font-semibold text-[#8B0029]">
                        {attr.key}
                      </dt>
                      <dd className="text-xs text-[#5C5255]">{attr.desc}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 4-5. 인터랙티브 지식그래프 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="mb-6">
            <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
              04 / INTERACTIVE KNOWLEDGE GRAPH
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
              인터랙티브 지식그래프 탐색
            </h3>
            <p className="mt-2 max-w-3xl text-sm text-[#5C5255]">
              Neo4j에서 추출한 전체 원본 데이터를 브라우저 위에서 직접 탐색할 수
              있습니다. 클래스·연도·일자 필터와 이름 검색을 조합하고, 노드를
              클릭해 원본 속성과 연결 관계를 확인해 보세요.
            </p>
          </div>

          <KnowledgeGraph
            graph={graph}
            loading={loading}
            error={error}
            onUploadJson={onUploadJson}
            sourceLabel={sourceLabel}
          />
        </div>

        {/* 4-6. 진행 과정 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
                05 / TIMELINE
              </p>
              <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
                진행 과정
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5C5255]">
                모델링과 데이터 구축, Cypher 질의 검증을 마치고 현재 인문학적
                해석과 웹 시각화 고도화를 진행하고 있습니다.
              </p>
            </div>

            <ol className="relative space-y-5 border-s border-[#201B1D]/15 ps-6 lg:col-span-8">
              {TIMELINE_STEPS.map((item) => {
                const isDone = item.status === '완료';
                const isInProgress = item.status === '진행 중';
                return (
                  <li key={item.step} className="relative">
                    <span
                      className={`absolute -start-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                        isDone
                          ? 'border-[#8B0029] bg-[#8B0029] text-[#FFFDF9]'
                          : isInProgress
                            ? 'border-[#8B0029] bg-[#FFFDF9] text-[#8B0029]'
                            : 'border-[#201B1D]/25 bg-[#F5EEE5] text-[#5C5255]'
                      }`}
                      aria-hidden="true"
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : isInProgress ? (
                        <CircleDot className="h-3 w-3" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                    </span>

                    <div className="flex flex-col justify-between gap-2 rounded-2xl border border-[#201B1D]/10 bg-[#FFFDF9] p-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-mono text-xs text-[#5C5255]">
                            0{item.step}
                          </span>
                          <h4 className="text-sm font-bold text-[#201B1D]">
                            {item.title}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-[#5C5255]">
                          {item.detail}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 self-start rounded-md px-2.5 py-1 text-xs font-semibold sm:self-center ${
                          isDone
                            ? 'bg-[#F5EEE5] text-[#201B1D]'
                            : isInProgress
                              ? 'bg-[#8B0029]/10 text-[#8B0029]'
                              : 'border border-[#201B1D]/15 text-[#5C5255]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* 4-7. 나의 역할과 AI 활용·검증 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="mb-8">
            <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
              06 / ROLE & VERIFICATION
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
              나의 역할과 AI 활용·검증
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-6 sm:p-8">
              <h4 className="font-serif text-lg font-bold text-[#201B1D]">
                나의 역할
              </h4>
              <ul className="mt-4 space-y-2.5">
                {MY_ROLES.map((role) => (
                  <li
                    key={role}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[#201B1D]"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B0029]"
                      aria-hidden="true"
                    />
                    <span>{role}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#F5EEE5]/75 p-6 sm:p-8">
              <h4 className="font-serif text-lg font-bold text-[#201B1D]">
                AI 활용과 검증
              </h4>
              <p className="mt-4 text-sm leading-[1.85] text-[#201B1D]">
                ChatGPT를 활용해 데이터 모델·Cypher 코드·웹페이지 구현을
                보조받고, 결과를 원자료 및 Neo4j 실행 결과와 대조하여
                검증했습니다. AI가 생성한 내용은 그대로 채택하지 않고,
                고유명사·분류·관계 방향과 질의 결과를 직접 확인했습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 4-8. 사용 도구 및 출처 */}
        <div className="border-t border-[#201B1D]/12 pt-14">
          <div className="mb-8">
            <p className="font-mono text-xs font-semibold tracking-wider text-[#8B0029]">
              07 / TOOLS & SOURCES
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[#201B1D]">
              사용 도구 및 출처
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-6 sm:p-7">
              <h4 className="font-serif text-base font-bold text-[#201B1D]">
                사용 도구
              </h4>
              <div className="mt-4 flex flex-wrap gap-2">
                {TOOLS.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-lg border border-[#201B1D]/12 bg-[#F5EEE5] px-3 py-1.5 font-mono text-xs font-medium text-[#201B1D]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#201B1D]/12 bg-[#FFFDF9] p-6 sm:p-7">
              <h4 className="font-serif text-base font-bold text-[#201B1D]">
                자료와 출처
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-[#5C5255]">
                {SOURCES.map((source) => (
                  <li key={source} className="flex items-start gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B0029]/70"
                      aria-hidden="true"
                    />
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
