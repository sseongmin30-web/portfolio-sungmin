import { useEffect, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Header, NavSectionId } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ProjectSection } from './components/ProjectSection';
import { NODE_CLASSES, ParsedKnowledgeGraph } from './types/graph';
import { parseNeo4jJson } from './utils/parseNeo4j';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('home');
  const [graph, setGraph] = useState<ParsedKnowledgeGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('data/neo4j-data.json');

  // Auto-fetch relative Neo4j JSON dataset on mount
  useEffect(() => {
    let cancelled = false;
    async function loadDefaultGraph() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('./data/neo4j-data.json');
        if (!res.ok) {
          throw new Error(`데이터 요청 실패 (HTTP ${res.status})`);
        }
        const raw = await res.json();
        const parsed = parseNeo4jJson(raw);
        if (!cancelled) {
          setGraph(parsed);
          setSourceLabel('data/neo4j-data.json');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `기본 지식그래프 데이터를 불러오지 못했습니다 (${err.message}). 상단의 'JSON 직접 불러오기'를 이용해 주세요.`
              : '기본 지식그래프 데이터를 불러오지 못했습니다.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadDefaultGraph();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track visible section for header active navigation highlight
  useEffect(() => {
    const sectionIds: NavSectionId[] = ['home', 'about', 'project', 'contact'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id as NavSectionId);
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.05, 0.25, 0.5],
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleUploadJson = (raw: unknown, fileName: string) => {
    try {
      const parsed = parseNeo4jJson(raw);
      setGraph(parsed);
      setError(null);
      setSourceLabel(fileName);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '업로드한 JSON 구조를 해석할 수 없습니다.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#201B1D]">
      <Header activeSection={activeSection} />

      <main>
        <HeroSection
          nodeCount={graph?.nodes.length ?? 150}
          edgeCount={graph?.edges.length ?? 242}
          classCount={NODE_CLASSES.length}
        />

        <AboutSection />

        <ProjectSection
          graph={graph}
          loading={loading}
          error={error}
          onUploadJson={handleUploadJson}
          sourceLabel={sourceLabel}
        />
      </main>

      <ContactSection />
    </div>
  );
}
