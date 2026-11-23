# 심성민 | 디지털인문학 포트폴리오 & 석탑대동제 지식그래프 (정적 웹사이트)

2025–2026 고려대학교 석탑대동제(KUdyssey · Kulimax) 지식그래프 분석 연구를 중심으로 한 디지털인문학 포트폴리오 정적 웹사이트입니다.  
빌드 도구, 백엔드 서버, 데이터베이스 연결, API 키 없이 **HTML · CSS · JavaScript 정적 파일만으로도 바로 실행 및 GitHub Pages 배포**가 가능합니다.

## 파일 구성

- `index.html` : 시맨틱 구조 기반 단일 페이지 포트폴리오 마크업
- `styles.css` : 크림슨·아이보리 색상 체계, 반응형 레이아웃, 지식그래프 다크 캔버스 스타일
- `app.js` : Neo4j JSON 재귀 파서, D3.js 포스 레이아웃 그래프, 필터·검색·드래그·확대·상세 패널 제어
- `data/neo4j-data.json` : 2025–2026 석탑대동제 Neo4j 원본 데이터 (노드 150개, 관계 242개, 5종 클래스)
- `assets/profile-placeholder.svg` : 4:3 비율 프로필 사진 플레이스홀더
- `vendor/d3.min.js` : D3.js v7 로컬 번들 (오프라인/CDN 차단 환경에서도 동작)

## 실행 및 GitHub Pages 배포

1. **GitHub Pages 직접 배포 (권장)**: 저장소 루트(`/` 또는 `dist/`)를 그대로 GitHub Pages 정적 호스팅으로 연결하면 추가 빌드 없이 즉시 동작합니다(모든 경로는 `./` 상대경로로 구성되어 저장소 하위 경로에서도 정상 작동합니다).
2. **로컬 확인**:
   ```bash
   python3 -m http.server 8000
   # 또는
   npm run dev
   ```
   (`file://` 환경에서 직접 `index.html`을 열어 브라우저 보안 정책으로 자동 로드가 제한되는 경우, 그래프 상단의 **JSON 직접 불러오기** 버튼으로 `data/neo4j-data.json`을 선택해 실행할 수 있습니다.)
