import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Maximize2,
  RotateCcw,
  Search,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  Network,
} from 'lucide-react';
import {
  GraphEdge,
  GraphNode,
  NODE_CLASSES,
  NODE_CLASS_META,
  NodeClass,
  ParsedKnowledgeGraph,
} from '../types/graph';

interface KnowledgeGraphProps {
  graph: ParsedKnowledgeGraph | null;
  loading: boolean;
  error: string | null;
  onUploadJson: (raw: unknown, fileName: string) => void;
  sourceLabel: string;
}

type ClassFilter = '전체' | NodeClass;
type YearFilter = '전체' | '2025' | '2026';
type DayFilter = '전체' | 'Day 1' | 'Day 2' | 'Day 3';

interface SimNode extends GraphNode, d3.SimulationNodeDatum {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  source: SimNode;
  target: SimNode;
}

const YEAR_OPTIONS: YearFilter[] = ['전체', '2025', '2026'];
const DAY_OPTIONS: DayFilter[] = ['전체', 'Day 1', 'Day 2', 'Day 3'];
const CLASS_OPTIONS: ClassFilter[] = ['전체', ...NODE_CLASSES];

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  graph,
  loading,
  error,
  onUploadJson,
  sourceLabel,
}) => {
  const [classFilter, setClassFilter] = useState<ClassFilter>('전체');
  const [yearFilter, setYearFilter] = useState<YearFilter>('전체');
  const [dayFilter, setDayFilter] = useState<DayFilter>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const nodeCirclesRef = useRef<d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown> | null>(null);
  const nodeLabelsRef = useRef<d3.Selection<SVGTextElement, SimNode, SVGGElement, unknown> | null>(null);
  const linkLinesRef = useRef<d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);

  // Lookup maps for quick relationship inspection in detail panel
  const { nodeById, adjacencyByNodeId } = useMemo(() => {
    const nMap = new Map<string, GraphNode>();
    const adj = new Map<string, { edge: GraphEdge; other: GraphNode; direction: 'out' | 'in' }[]>();
    if (!graph) {
      return { nodeById: nMap, adjacencyByNodeId: adj };
    }
    for (const node of graph.nodes) {
      nMap.set(node.id, node);
      adj.set(node.id, []);
    }
    for (const edge of graph.edges) {
      const s = nMap.get(edge.sourceId);
      const t = nMap.get(edge.targetId);
      if (!s || !t) continue;
      adj.get(s.id)?.push({ edge, other: t, direction: 'out' });
      adj.get(t.id)?.push({ edge, other: s, direction: 'in' });
    }
    return { nodeById: nMap, adjacencyByNodeId: adj };
  }, [graph]);

  // Compute filtered nodes & edges, preserving Festival & Day context nodes when filters apply
  const { visibleNodes, visibleEdges, isFiltered, primaryMatchedIds } = useMemo(() => {
    if (!graph) {
      return {
        visibleNodes: [] as GraphNode[],
        visibleEdges: [] as GraphEdge[],
        isFiltered: false,
        primaryMatchedIds: new Set<string>(),
      };
    }

    const q = searchQuery.trim().toLowerCase();
    const hasFilter =
      classFilter !== '전체' ||
      yearFilter !== '전체' ||
      dayFilter !== '전체' ||
      q.length > 0;

    if (!hasFilter) {
      return {
        visibleNodes: graph.nodes,
        visibleEdges: graph.edges,
        isFiltered: false,
        primaryMatchedIds: new Set(graph.nodes.map((n) => n.id)),
      };
    }

    const activeYear = yearFilter === '전체' ? null : Number(yearFilter);
    const matchesYearAndDay = (n: GraphNode) => {
      if (activeYear !== null && !n.years.includes(activeYear)) return false;
      if (dayFilter !== '전체' && !n.days.includes(dayFilter)) return false;
      return true;
    };

    const primaryIds = new Set<string>();
    for (const node of graph.nodes) {
      if (classFilter !== '전체' && node.nodeClass !== classFilter) continue;
      if (!matchesYearAndDay(node)) continue;
      if (q.length > 0) {
        const haystack = [
          node.name,
          node.nodeClass,
          ...Object.values(node.properties).map((v) => String(v ?? '')),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      primaryIds.add(node.id);
    }

    const includedIds = new Set<string>(primaryIds);

    // Add connected 일자 context nodes (respecting active year/day filter)
    for (const edge of graph.edges) {
      const s = nodeById.get(edge.sourceId);
      const t = nodeById.get(edge.targetId);
      if (!s || !t) continue;
      if (primaryIds.has(s.id) && t.nodeClass === '일자' && matchesYearAndDay(t)) {
        includedIds.add(t.id);
      }
      if (primaryIds.has(t.id) && s.nodeClass === '일자' && matchesYearAndDay(s)) {
        includedIds.add(s.id);
      }
    }

    // Add connected 축제 context nodes for included 일자 nodes (or primary nodes)
    for (const edge of graph.edges) {
      if (edge.type !== 'HAS_DAY') continue;
      const fest = nodeById.get(edge.sourceId);
      const day = nodeById.get(edge.targetId);
      if (!fest || !day) continue;
      if (includedIds.has(day.id) && (activeYear === null || fest.years.includes(activeYear))) {
        includedIds.add(fest.id);
      }
      if (primaryIds.has(fest.id) && matchesYearAndDay(day)) {
        includedIds.add(day.id);
      }
    }

    const vNodes = graph.nodes.filter((n) => includedIds.has(n.id));
    const vEdges = graph.edges.filter((e) => {
      if (!includedIds.has(e.sourceId) || !includedIds.has(e.targetId)) return false;
      return true;
    });

    return {
      visibleNodes: vNodes,
      visibleEdges: vEdges,
      isFiltered: true,
      primaryMatchedIds: primaryIds,
    };
  }, [graph, classFilter, yearFilter, dayFilter, searchQuery, nodeById]);

  // Keep selectedNodeId valid if filter excludes it (don't force clear unless removed)
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeById.get(selectedNodeId) ?? null;
  }, [selectedNodeId, nodeById]);

  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return nodeById.get(hoveredNodeId) ?? null;
  }, [hoveredNodeId, nodeById]);

  // Build / rebuild D3 force-directed graph when visible subset changes
  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const width = containerEl.clientWidth || 820;
    const height = containerEl.clientHeight || 560;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (visibleNodes.length === 0) {
      simNodesRef.current = [];
      simLinksRef.current = [];
      return;
    }

    // Preserve previous positions if nodes already simulated for smoother filter transitions
    const prevPos = new Map<string, { x: number; y: number }>();
    for (const prev of simNodesRef.current) {
      prevPos.set(prev.id, { x: prev.x, y: prev.y });
    }

    const simNodes: SimNode[] = visibleNodes.map((n, idx) => {
      const old = prevPos.get(n.id);
      const angle = (idx / Math.max(1, visibleNodes.length)) * Math.PI * 2;
      const spread = n.nodeClass === '축제' ? 90 : n.nodeClass === '일자' ? 160 : 240;
      return {
        ...n,
        x: old ? old.x : width / 2 + Math.cos(angle) * spread,
        y: old ? old.y : height / 2 + Math.sin(angle) * spread,
      };
    });

    const simNodeById = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = [];
    for (const e of visibleEdges) {
      const s = simNodeById.get(e.sourceId);
      const t = simNodeById.get(e.targetId);
      if (!s || !t) continue;
      simLinks.push({
        id: e.id,
        type: e.type,
        sourceId: e.sourceId,
        targetId: e.targetId,
        source: s,
        target: t,
      });
    }

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;

    const rootG = svg.append('g').attr('class', 'graph-viewport');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4.5])
      .on('zoom', (event) => {
        rootG.attr('transform', event.transform.toString());
        setZoomPercent(Math.round(event.transform.k * 100));
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Click empty space clears selection
    svg.on('click', (event) => {
      if (event.target === svgEl) {
        setSelectedNodeId(null);
      }
    });

    const linkGroup = rootG.append('g').attr('class', 'graph-links');
    const nodeGroup = rootG.append('g').attr('class', 'graph-nodes');
    const labelGroup = rootG.append('g').attr('class', 'graph-labels');

    const linksSel = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks, (d) => d.id)
      .join('line')
      .attr('stroke', (d) =>
        d.type === 'HAS_DAY'
          ? 'rgba(245, 158, 11, 0.48)'
          : d.type === 'PERFORMED_IN'
            ? 'rgba(56, 189, 248, 0.34)'
            : 'rgba(192, 132, 252, 0.30)'
      )
      .attr('stroke-width', (d) => (d.type === 'HAS_DAY' ? 2 : 1.15));

    const dragBehavior = d3
      .drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.28).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Keep node slightly flexible or release cleanly after drag
        d.fx = null;
        d.fy = null;
      });

    const nodesSel = nodeGroup
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(simNodes, (d) => d.id)
      .join('circle')
      .attr('r', (d) => NODE_CLASS_META[d.nodeClass].radius)
      .attr('fill', (d) => NODE_CLASS_META[d.nodeClass].color)
      .attr('stroke', '#151013')
      .attr('stroke-width', 1.8)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredNodeId(d.id);
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
      })
      .call(dragBehavior);

    const labelsSel = labelGroup
      .selectAll<SVGTextElement, SimNode>('text')
      .data(simNodes, (d) => d.id)
      .join('text')
      .text((d) => d.name)
      .attr('font-size', (d) =>
        d.nodeClass === '축제' ? 13 : d.nodeClass === '일자' ? 11.5 : 10
      )
      .attr('font-weight', (d) =>
        d.nodeClass === '축제' || d.nodeClass === '일자' ? 600 : 500
      )
      .attr('fill', '#F8F4F0')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => -(NODE_CLASS_META[d.nodeClass].radius + 6))
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.9)');

    nodeCirclesRef.current = nodesSel;
    nodeLabelsRef.current = labelsSel;
    linkLinesRef.current = linksSel;

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => (d.type === 'HAS_DAY' ? 76 : 105))
          .strength((d) => (d.type === 'HAS_DAY' ? 0.75 : 0.45))
      )
      .force(
        'charge',
        d3.forceManyBody<SimNode>().strength((d) =>
          d.nodeClass === '축제' ? -420 : d.nodeClass === '일자' ? -280 : -115
        )
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide<SimNode>().radius((d) => NODE_CLASS_META[d.nodeClass].radius + 8)
      )
      .force('x', d3.forceX(width / 2).strength(0.055))
      .force('y', d3.forceY(height / 2).strength(0.055))
      .on('tick', () => {
        linksSel
          .attr('x1', (d) => (d.source as SimNode).x)
          .attr('y1', (d) => (d.source as SimNode).y)
          .attr('x2', (d) => (d.target as SimNode).x)
          .attr('y2', (d) => (d.target as SimNode).y);

        nodesSel.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
        labelsSel.attr('x', (d) => d.x).attr('y', (d) => d.y);
      });

    simulationRef.current = simulation;

    // Fit nicely initially
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(0.92);
    svg.call(zoom.transform, initialTransform);
    setZoomPercent(92);

    return () => {
      simulation.stop();
    };
  }, [visibleNodes, visibleEdges]);

  // Apply hover/selection highlighting & context label visibility without restarting physics
  useEffect(() => {
    const nodesSel = nodeCirclesRef.current;
    const labelsSel = nodeLabelsRef.current;
    const linksSel = linkLinesRef.current;
    if (!nodesSel || !labelsSel || !linksSel) return;

    const focusId = hoveredNodeId ?? selectedNodeId;
    const neighborIds = new Set<string>();
    const activeEdgeIds = new Set<string>();

    if (focusId) {
      neighborIds.add(focusId);
      for (const link of simLinksRef.current) {
        if (link.sourceId === focusId || link.targetId === focusId) {
          activeEdgeIds.add(link.id);
          neighborIds.add(link.sourceId);
          neighborIds.add(link.targetId);
        }
      }
    }

    nodesSel
      .attr('opacity', (d) => {
        if (!focusId) return 1;
        return neighborIds.has(d.id) ? 1 : 0.16;
      })
      .attr('stroke', (d) => {
        if (d.id === selectedNodeId) return '#FFFDF9';
        if (d.id === hoveredNodeId) return NODE_CLASS_META[d.nodeClass].ring;
        return '#151013';
      })
      .attr('stroke-width', (d) => {
        if (d.id === selectedNodeId || d.id === hoveredNodeId) return 3;
        return 1.6;
      });

    linksSel
      .attr('stroke-opacity', (d) => {
        if (!focusId) return 1;
        return activeEdgeIds.has(d.id) ? 0.95 : 0.08;
      })
      .attr('stroke-width', (d) => {
        if (focusId && activeEdgeIds.has(d.id)) return 2.4;
        return d.type === 'HAS_DAY' ? 2 : 1.15;
      });

    labelsSel.attr('opacity', (d) => {
      if (focusId) {
        return neighborIds.has(d.id) ? 1 : 0;
      }
      if (d.nodeClass === '축제' || d.nodeClass === '일자') return 0.95;
      if (isFiltered && visibleNodes.length <= 45) return 0.9;
      if (isFiltered && primaryMatchedIds.has(d.id) && visibleNodes.length <= 80) return 0.85;
      return 0;
    });
  }, [hoveredNodeId, selectedNodeId, isFiltered, visibleNodes.length, primaryMatchedIds]);

  const handleZoomBy = (factor: number) => {
    const svgEl = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!svgEl || !zoom) return;
    d3.select(svgEl).transition().duration(220).call(zoom.scaleBy, factor);
  };

  const handleResetView = () => {
    const svgEl = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (svgEl && zoom) {
      d3.select(svgEl)
        .transition()
        .duration(260)
        .call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.92));
    }
    if (simulationRef.current) {
      for (const n of simNodesRef.current) {
        n.fx = null;
        n.fy = null;
      }
      simulationRef.current.alpha(0.45).restart();
    }
  };

  const handleResetFilters = () => {
    setClassFilter('전체');
    setYearFilter('전체');
    setDayFilter('전체');
    setSearchQuery('');
    setSelectedNodeId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      onUploadJson(parsed, file.name);
      setSelectedNodeId(null);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? `JSON 파일을 불러오지 못했습니다: ${err.message}`
          : '올바른 Neo4j JSON 파일이 아닙니다.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [];
    return adjacencyByNodeId.get(selectedNode.id) ?? [];
  }, [selectedNode, adjacencyByNodeId]);

  const totalNodes = graph?.nodes.length ?? 0;
  const totalEdges = graph?.edges.length ?? 0;

  return (
    <div id="knowledge-graph" className="scroll-mt-24">
      {/* Control Bar */}
      <div className="rounded-t-[24px] border border-b-0 border-[#201B1D]/12 bg-[#F5EEE5] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#201B1D]/10 pb-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#5C5255]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#8B0029]">
                <Network className="h-3.5 w-3.5" aria-hidden="true" />
                Neo4j Knowledge Graph Explorer
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-mono text-[#201B1D]">
                전체 노드 {totalNodes}개 · 관계 {totalEdges}개
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px]">{sourceLabel}</span>
            </div>
            <p className="mt-1 text-xs text-[#5C5255]">
              필터를 적용하면 선택한 조건에 해당하는 참여 주체와 연결된{' '}
              <strong className="font-semibold text-[#201B1D]">축제·일자 문맥 노드</strong>가 함께 표시됩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Neo4j JSON 파일 업로드"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#201B1D]/15 bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#201B1D] transition-colors hover:border-[#8B0029]/40 hover:text-[#8B0029]"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              JSON 직접 불러오기
            </button>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#8B0029]/25 bg-[#8B0029]/8 px-3 py-1.5 text-xs font-semibold text-[#8B0029] transition-colors hover:bg-[#8B0029]/15"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                필터 초기화
              </button>
            )}
          </div>
        </div>

        {(error || uploadError) && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#8B0029]/30 bg-[#8B0029]/8 px-4 py-3 text-xs text-[#8B0029]"
          >
            {uploadError || error}
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Class filter */}
          <div className="lg:col-span-5">
            <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#5C5255]">
              노드 클래스
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="노드 클래스 필터">
              {CLASS_OPTIONS.map((cls) => {
                const active = classFilter === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassFilter(cls)}
                    aria-pressed={active}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#8B0029] text-[#FFFDF9] shadow-xs'
                        : 'border border-[#201B1D]/12 bg-[#FFFDF9] text-[#201B1D] hover:border-[#8B0029]/35'
                    }`}
                  >
                    {cls !== '전체' && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: NODE_CLASS_META[cls].color }}
                        aria-hidden="true"
                      />
                    )}
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Year & Day filter */}
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-4">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#5C5255]">
                연도
              </div>
              <div className="flex gap-1.5" role="group" aria-label="연도 필터">
                {YEAR_OPTIONS.map((yr) => {
                  const active = yearFilter === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setYearFilter(yr)}
                      aria-pressed={active}
                      className={`tabular-nums flex-1 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#201B1D] text-[#FFFDF9]'
                          : 'border border-[#201B1D]/12 bg-[#FFFDF9] text-[#201B1D] hover:border-[#201B1D]/35'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#5C5255]">
                일자
              </div>
              <div className="flex gap-1" role="group" aria-label="일자 필터">
                {DAY_OPTIONS.map((d) => {
                  const active = dayFilter === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayFilter(d)}
                      aria-pressed={active}
                      className={`tabular-nums flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#201B1D] text-[#FFFDF9]'
                          : 'border border-[#201B1D]/12 bg-[#FFFDF9] text-[#201B1D] hover:border-[#201B1D]/35'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="lg:col-span-3">
            <label
              htmlFor="graph-search-input"
              className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[#5C5255]"
            >
              이름 · 속성 검색
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#5C5255]"
                aria-hidden="true"
              />
              <input
                id="graph-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="예: 잔나비, 힙합, KUdyssey..."
                className="w-full rounded-lg border border-[#201B1D]/15 bg-[#FFFDF9] py-1.5 pr-3 pl-8 text-xs text-[#201B1D] placeholder:text-[#5C5255]/60 focus:border-[#8B0029] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Dark Graph Canvas + Right Detail Panel */}
      <div className="grid overflow-hidden rounded-b-[24px] border border-[#201B1D]/15 bg-[#151013] lg:grid-cols-12">
        {/* Dark Network Canvas */}
        <div
          ref={containerRef}
          className="relative h-[460px] w-full select-none sm:h-[560px] lg:col-span-8 lg:h-[620px]"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#EDE5DC]">
              지식그래프 데이터를 불러오는 중입니다...
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-[#EDE5DC]">
              <p className="text-sm font-medium">
                선택한 필터 조건에 일치하는 노드가 없습니다.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="cursor-pointer rounded-lg border border-[#FFFDF9]/25 px-3.5 py-1.5 text-xs font-medium text-[#FFFDF9] hover:bg-[#FFFDF9]/10"
              >
                전체 데이터 다시 보기
              </button>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="h-full w-full touch-none"
              role="img"
              aria-label="2025–2026 고려대학교 석탑대동제 지식그래프 네트워크"
            />
          )}

          {/* Top-left Live Count & Hover Readout */}
          <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/12 bg-[#1E171B]/90 px-3 py-1.5 font-mono text-xs text-[#F5EEE5] backdrop-blur-sm">
              <span className="tabular-nums">
                표시: 노드 {visibleNodes.length}/{totalNodes}개 · 관계{' '}
                {visibleEdges.length}/{totalEdges}개
              </span>
            </div>

            {hoveredNode && (
              <div className="max-w-xs rounded-lg border border-white/15 bg-[#1E171B]/95 px-3 py-2 text-xs text-[#FFFDF9] shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: NODE_CLASS_META[hoveredNode.nodeClass].color }}
                  />
                  <span className="font-semibold">{hoveredNode.name}</span>
                  <span className="text-[11px] text-[#D7CCC8]">
                    ({hoveredNode.nodeClass})
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#C5B8B2]">
                  연결 관계 {hoveredNode.degree}개 · 클릭하여 상세 보기
                </div>
              </div>
            )}
          </div>

          {/* Top-right Zoom & Reset Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-1 rounded-xl border border-white/12 bg-[#1E171B]/90 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handleZoomBy(1.25)}
              className="cursor-pointer rounded-lg p-1.5 text-[#F5EEE5] transition-colors hover:bg-white/10"
              title="확대"
              aria-label="그래프 확대"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoomBy(0.8)}
              className="cursor-pointer rounded-lg p-1.5 text-[#F5EEE5] transition-colors hover:bg-white/10"
              title="축소"
              aria-label="그래프 축소"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="tabular-nums px-1.5 font-mono text-[11px] text-[#D7CCC8]">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleResetView}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-medium text-[#F5EEE5] transition-colors hover:bg-white/10"
              title="초기화"
              aria-label="그래프 위치 및 배율 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              초기화
            </button>
          </div>

          {/* Bottom-left Legend */}
          <div className="pointer-events-auto absolute right-4 bottom-4 left-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#1E171B]/88 px-3.5 py-2.5 text-[11px] text-[#EDE5DC] backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {NODE_CLASSES.map((cls) => (
                <div key={cls} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: NODE_CLASS_META[cls].color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{cls}</span>
                  <span className="tabular-nums font-mono text-[#A89B96]">
                    ({graph?.classCounts[cls] ?? 0})
                  </span>
                </div>
              ))}
            </div>
            <div className="hidden font-mono text-[10px] text-[#A89B96] sm:block">
              노드 드래그 · 휠 확대/축소 · 클릭 시 속성 조회
            </div>
          </div>
        </div>

        {/* Right-Side Detail Panel */}
        <aside
          aria-label="선택된 노드 상세 정보"
          className="flex h-full max-h-[620px] flex-col border-t border-white/10 bg-[#1D161A] text-[#F5EEE5] lg:col-span-4 lg:border-t-0 lg:border-l"
        >
          {selectedNode ? (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[#EDE5DC]">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            NODE_CLASS_META[selectedNode.nodeClass].color,
                        }}
                      />
                      {selectedNode.nodeClass}
                    </span>
                    <h4 className="mt-1.5 font-serif text-xl font-bold text-[#FFFDF9]">
                      {selectedNode.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    className="cursor-pointer rounded-lg p-1 text-[#C5B8B2] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="선택 해제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-[#D7CCC8]">
                  <span className="tabular-nums rounded-md bg-white/8 px-2.5 py-1 text-[#FFFDF9]">
                    연결 관계 {selectedConnections.length}개
                  </span>
                  {selectedNode.years.length > 0 && (
                    <span className="tabular-nums">
                      연도: {selectedNode.years.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* All Node Properties */}
                <div>
                  <h5 className="font-mono text-[11px] font-semibold tracking-wider text-[#C5B8B2] uppercase">
                    노드 속성 (Properties)
                  </h5>
                  <dl className="mt-2.5 divide-y divide-white/8 rounded-xl border border-white/10 bg-black/20">
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <div
                        key={key}
                        className="grid grid-cols-3 gap-2 px-3.5 py-2.5 text-xs"
                      >
                        <dt className="font-mono text-[#C5B8B2]">{key}</dt>
                        <dd className="col-span-2 break-words font-medium text-[#FFFDF9]">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Connected Relationships */}
                <div>
                  <h5 className="font-mono text-[11px] font-semibold tracking-wider text-[#C5B8B2] uppercase">
                    연결된 관계 ({selectedConnections.length})
                  </h5>
                  <ul className="mt-2.5 space-y-1.5">
                    {selectedConnections.map(({ edge, other, direction }) => (
                      <li key={edge.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(other.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-left text-xs transition-colors hover:border-white/25 hover:bg-white/[0.09]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    NODE_CLASS_META[other.nodeClass].color,
                                }}
                              />
                              <span className="truncate font-semibold text-[#FFFDF9]">
                                {other.name}
                              </span>
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] text-[#B8ABA5]">
                              {direction === 'out' ? '→ ' : '← '}
                              {edge.type} · {other.nodeClass}
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] text-[#C5B8B2]">
                            이동
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between p-6">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[#FDA4AF]">
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <h4 className="mt-4 font-serif text-lg font-bold text-[#FFFDF9]">
                  노드를 선택해 세부 정보를 확인하세요
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-[#D7CCC8]">
                  왼쪽 네트워크 그래프에서 원하는 노드를 클릭하면 해당 노드의 모든
                  속성(<span className="font-mono">id, genre, industry, orgType</span>{' '}
                  등)과 연결 관계 수, 이웃 노드를 이곳에서 탐색할 수 있습니다.
                </p>
              </div>

              <div className="mt-6 space-y-2.5 rounded-xl border border-white/10 bg-black/20 p-4 text-xs">
                <div className="font-semibold text-[#FFFDF9]">데이터 요약</div>
                <div className="flex justify-between text-[#D7CCC8]">
                  <span>전체 노드</span>
                  <span className="tabular-nums font-mono text-[#FFFDF9]">
                    {totalNodes}개
                  </span>
                </div>
                <div className="flex justify-between text-[#D7CCC8]">
                  <span>전체 관계</span>
                  <span className="tabular-nums font-mono text-[#FFFDF9]">
                    {totalEdges}개
                  </span>
                </div>
                <div className="flex justify-between text-[#D7CCC8]">
                  <span>현재 표시 중</span>
                  <span className="tabular-nums font-mono text-[#FDA4AF]">
                    노드 {visibleNodes.length}개 · 관계 {visibleEdges.length}개
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
