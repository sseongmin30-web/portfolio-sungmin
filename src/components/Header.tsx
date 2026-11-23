import React from 'react';

export type NavSectionId = 'home' | 'about' | 'project' | 'contact';

interface HeaderProps {
  activeSection: NavSectionId;
}

const NAV_ITEMS: { id: NavSectionId; label: string }[] = [
  { id: 'about', label: '자기소개' },
  { id: 'project', label: '프로젝트' },
  { id: 'contact', label: '연락' },
];

export const Header: React.FC<HeaderProps> = ({ activeSection }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[#201B1D]/10 bg-[#FFFDF9]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <a
          href="#home"
          className="group flex items-center gap-3 rounded-lg py-0.5 text-left transition-colors"
          aria-label="심성민 홈으로 이동"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#8B0029]/20 bg-[#8B0029]/[0.06] text-[#8B0029]">
            <svg
              viewBox="0 0 36 36"
              className="h-6 w-6"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 5.5H29V18.5C29 25.4 23.8 29.8 18 31.8C12.2 29.8 7 25.4 7 18.5V5.5Z"
                fill="#8B0029"
              />
              <path
                d="M9.5 8H26.5V18.2C26.5 23.6 22.5 27.1 18 28.9C13.5 27.1 9.5 23.6 9.5 18.2V8Z"
                stroke="#FFFDF9"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <path
                d="M18 11.2L20.8 15.2L23.2 13.8L22 19.6H14L12.8 13.8L15.2 15.2L18 11.2Z"
                fill="#FFFDF9"
              />
              <path
                d="M13.5 22.2H22.5"
                stroke="#FFFDF9"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-base font-bold tracking-tight text-[#201B1D] transition-colors group-hover:text-[#8B0029]">
              심성민
            </span>
            <span className="font-mono text-[11px] tracking-wider text-[#5C5255]">
              Sungmin Sim
            </span>
          </span>
        </a>

        <nav aria-label="주 내비게이션" className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  isActive
                    ? 'bg-[#8B0029]/10 font-semibold text-[#8B0029]'
                    : 'text-[#5C5255] hover:bg-[#F5EEE5] hover:text-[#201B1D]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-[#8B0029]"
                  />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
