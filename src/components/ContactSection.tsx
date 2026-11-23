import React from 'react';
import { Code2, Linkedin, Mail } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <footer
      id="contact"
      className="scroll-mt-20 bg-[#2C0713] py-16 text-[#FFFDF9] sm:py-22"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold tracking-wider text-[#F2B8C6] uppercase">
            Contact
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-[#FFFDF9] sm:text-3xl">
            연락
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#E9D7DC] sm:text-base">
            디지털인문학 연구, 문화 데이터 분석 및 프로젝트 협업과 관련한 문의는
            이메일로 편하게 연락 주세요.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {/* Email Card */}
          <a
            href="mailto:sseongmin30@gmail.com"
            className="group flex flex-col justify-between rounded-[22px] border border-white/15 bg-white/[0.06] p-6 transition-colors hover:border-[#F2B8C6]/50 hover:bg-white/[0.11]"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0029] text-[#FFFDF9]">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-[#FFFDF9]">
                이메일
              </h3>
              <p className="mt-1.5 font-mono text-sm text-[#F2B8C6] group-hover:underline">
                sseongmin30@gmail.com
              </p>
            </div>
            <span className="mt-6 text-xs font-medium text-[#E9D7DC]">
              메일 앱으로 바로 보내기 ↗
            </span>
          </a>

          {/* LinkedIn Placeholder Card */}
          <div className="flex flex-col justify-between rounded-[22px] border border-white/12 bg-white/[0.04] p-6">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-[#E9D7DC]">
                <Linkedin className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-[#FFFDF9]">
                LinkedIn
              </h3>
              <p className="mt-1.5 text-sm font-medium text-[#E9D7DC]/80">
                프로필 주소 준비 중
              </p>
            </div>
            <span className="mt-6 font-mono text-xs text-[#E9D7DC]/55">
              Placeholder · 추후 업데이트 예정
            </span>
          </div>

          {/* GitHub Placeholder Card */}
          <div className="flex flex-col justify-between rounded-[22px] border border-white/12 bg-white/[0.04] p-6">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-[#E9D7DC]">
                <Code2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-[#FFFDF9]">
                GitHub
              </h3>
              <p className="mt-1.5 text-sm font-medium text-[#E9D7DC]/80">
                저장소 주소 준비 중
              </p>
            </div>
            <span className="mt-6 font-mono text-xs text-[#E9D7DC]/55">
              Placeholder · 추후 업데이트 예정
            </span>
          </div>
        </div>

        <div className="mt-14 flex flex-col justify-between gap-2 border-t border-white/12 pt-6 text-xs text-[#E9D7DC]/70 sm:flex-row sm:items-center">
          <span>
            © 2026 심성민 (Sungmin Sim) · 고려대학교 노어노문학과
          </span>
          <span className="font-mono text-[11px]">
            2025–2026 고려대학교 석탑대동제 지식그래프 분석 포트폴리오
          </span>
        </div>
      </div>
    </footer>
  );
};
