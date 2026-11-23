import {
  GraphEdge,
  GraphNode,
  NODE_CLASSES,
  NodeClass,
  ParsedKnowledgeGraph,
} from '../types/graph';

interface RawNeo4jNode {
  identity?: number | string;
  elementId?: string;
  labels?: string[];
  properties?: Record<string, unknown>;
}

interface RawNeo4jRelation {
  identity?: number | string;
  elementId?: string;
  start?: number | string;
  end?: number | string;
  startNodeElementId?: string;
  endNodeElementId?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function deepParseValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return value;
  const parsed = tryParseJson(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => deepParseValue(item, depth + 1));
  }
  if (parsed && typeof parsed === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      out[k] = deepParseValue(v, depth + 1);
    }
    return out;
  }
  return parsed;
}

function resolveNodeClass(raw: RawNeo4jNode): NodeClass {
  const candidate =
    (raw.labels && raw.labels[0]) ||
    (typeof raw.properties?.class === 'string' ? raw.properties.class : '');
  if ((NODE_CLASSES as string[]).includes(candidate)) {
    return candidate as NodeClass;
  }
  return '조직';
}

function extractDayLabel(dayName: string): string | null {
  const match = dayName.match(/day\s*([123])/i);
  if (match) {
    return `Day ${match[1]}`;
  }
  return null;
}

function extractYearFromDayName(dayName: string): number | null {
  const match = dayName.match(/(20\d{2})/);
  if (match) {
    return Number(match[1]);
  }
  return null;
}

export function parseNeo4jJson(rawInput: unknown): ParsedKnowledgeGraph {
  const parsedRoot = deepParseValue(rawInput);

  if (!Array.isArray(parsedRoot)) {
    throw new Error('JSON 최상위 구조가 배열(Neo4j Query Table Export)이 아닙니다.');
  }

  const nodeMap = new Map<string, GraphNode>();
  const identityToNodeId = new Map<string, string>();
  const rawEdges: RawNeo4jRelation[] = [];
  const edgeSeen = new Set<string>();

  const registerNode = (candidate: unknown) => {
    const parsedNode = deepParseValue(candidate) as RawNeo4jNode | null;
    if (!parsedNode || typeof parsedNode !== 'object') return;
    if (
      parsedNode.elementId === undefined &&
      parsedNode.identity === undefined &&
      !parsedNode.properties
    ) {
      return;
    }

    const key =
      parsedNode.elementId !== undefined
        ? String(parsedNode.elementId)
        : `id:${String(parsedNode.identity)}`;

    if (!nodeMap.has(key)) {
      const properties =
        parsedNode.properties && typeof parsedNode.properties === 'object'
          ? { ...parsedNode.properties }
          : {};
      const nodeClass = resolveNodeClass(parsedNode);
      const displayName =
        typeof properties.name === 'string' && properties.name.length > 0
          ? properties.name
          : typeof properties.id === 'string'
            ? properties.id
            : key;

      nodeMap.set(key, {
        id: key,
        identity: parsedNode.identity ?? key,
        elementId: parsedNode.elementId ? String(parsedNode.elementId) : key,
        labels: Array.isArray(parsedNode.labels) ? [...parsedNode.labels] : [nodeClass],
        nodeClass,
        name: displayName,
        properties,
        years: [],
        days: [],
        degree: 0,
      });
    }

    if (parsedNode.identity !== undefined) {
      identityToNodeId.set(String(parsedNode.identity), key);
    }
    if (parsedNode.elementId !== undefined) {
      identityToNodeId.set(String(parsedNode.elementId), key);
    }
  };

  const registerRelation = (candidate: unknown) => {
    const rel = deepParseValue(candidate) as RawNeo4jRelation | null;
    if (!rel || typeof rel !== 'object' || !rel.type) return;

    const relKey =
      rel.elementId !== undefined
        ? String(rel.elementId)
        : `${String(rel.start)}->${String(rel.type)}->${String(rel.end)}:${String(rel.identity ?? '')}`;

    if (edgeSeen.has(relKey)) return;
    edgeSeen.add(relKey);
    rawEdges.push(rel);
  };

  for (const row of parsedRoot) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;

    if ('source' in record || 'target' in record || 'relation' in record) {
      if (record.source) registerNode(record.source);
      if (record.target) registerNode(record.target);
      if (record.relation) registerRelation(record.relation);
    } else {
      // Fallback for generic Neo4j column names (n, r, m, etc.)
      for (const val of Object.values(record)) {
        if (!val || typeof val !== 'object') continue;
        const obj = val as Record<string, unknown>;
        if ('labels' in obj) {
          registerNode(obj);
        } else if ('type' in obj && ('start' in obj || 'startNodeElementId' in obj)) {
          registerRelation(obj);
        }
      }
    }
  }

  const edges: GraphEdge[] = [];
  for (const rel of rawEdges) {
    const startLookup =
      rel.startNodeElementId !== undefined
        ? String(rel.startNodeElementId)
        : rel.start !== undefined
          ? String(rel.start)
          : '';
    const endLookup =
      rel.endNodeElementId !== undefined
        ? String(rel.endNodeElementId)
        : rel.end !== undefined
          ? String(rel.end)
          : '';

    const sourceId = nodeMap.has(startLookup)
      ? startLookup
      : identityToNodeId.get(startLookup);
    const targetId = nodeMap.has(endLookup)
      ? endLookup
      : identityToNodeId.get(endLookup);

    if (!sourceId || !targetId) continue;

    const edgeKey =
      rel.elementId !== undefined
        ? String(rel.elementId)
        : `${sourceId}-${rel.type}-${targetId}-${String(rel.identity ?? edges.length)}`;

    edges.push({
      id: edgeKey,
      identity: rel.identity ?? edgeKey,
      elementId: rel.elementId ? String(rel.elementId) : edgeKey,
      type: rel.type ?? 'RELATED_TO',
      sourceId,
      targetId,
      properties:
        rel.properties && typeof rel.properties === 'object' ? { ...rel.properties } : {},
    });

    const sNode = nodeMap.get(sourceId);
    const tNode = nodeMap.get(targetId);
    if (sNode) sNode.degree += 1;
    if (tNode) tNode.degree += 1;
  }

  // Derive festival years and Day 1/2/3 associations through HAS_DAY and participant edges
  const dayYearMap = new Map<string, number>();
  const dayLabelMap = new Map<string, string>();
  const nodeYearsMap = new Map<string, Set<number>>();
  const nodeDaysMap = new Map<string, Set<string>>();

  const addYear = (nodeId: string, year: number) => {
    if (!nodeYearsMap.has(nodeId)) nodeYearsMap.set(nodeId, new Set());
    nodeYearsMap.get(nodeId)!.add(year);
  };
  const addDay = (nodeId: string, day: string) => {
    if (!nodeDaysMap.has(nodeId)) nodeDaysMap.set(nodeId, new Set());
    nodeDaysMap.get(nodeId)!.add(day);
  };

  for (const node of nodeMap.values()) {
    if (node.nodeClass === '축제' && typeof node.properties.year === 'number') {
      addYear(node.id, node.properties.year);
    }
    if (node.nodeClass === '일자') {
      const label = extractDayLabel(node.name);
      if (label) {
        dayLabelMap.set(node.id, label);
        addDay(node.id, label);
      }
      const yr = extractYearFromDayName(node.name);
      if (yr) {
        dayYearMap.set(node.id, yr);
        addYear(node.id, yr);
      }
    }
  }

  // Link HAS_DAY: Festival -> Day
  for (const edge of edges) {
    if (edge.type === 'HAS_DAY') {
      const fest = nodeMap.get(edge.sourceId);
      const day = nodeMap.get(edge.targetId);
      if (fest && day) {
        const yr =
          typeof fest.properties.year === 'number'
            ? fest.properties.year
            : dayYearMap.get(day.id);
        if (yr) {
          dayYearMap.set(day.id, yr);
          addYear(day.id, yr);
          addYear(fest.id, yr);
        }
        const dLabel = dayLabelMap.get(day.id);
        if (dLabel) {
          addDay(fest.id, dLabel);
        }
      }
    }
  }

  // Propagate year and day from Day nodes to connected participants
  for (const edge of edges) {
    if (edge.type !== 'HAS_DAY') {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) continue;
      if (target.nodeClass === '일자') {
        const yr = dayYearMap.get(target.id);
        const dLabel = dayLabelMap.get(target.id);
        if (yr) addYear(source.id, yr);
        if (dLabel) addDay(source.id, dLabel);
      } else if (source.nodeClass === '일자') {
        const yr = dayYearMap.get(source.id);
        const dLabel = dayLabelMap.get(source.id);
        if (yr) addYear(target.id, yr);
        if (dLabel) addDay(target.id, dLabel);
      }
    }
  }

  const classCounts: Record<NodeClass, number> = {
    축제: 0,
    일자: 0,
    연예인: 0,
    학생참여주체: 0,
    조직: 0,
  };

  for (const node of nodeMap.values()) {
    node.years = Array.from(nodeYearsMap.get(node.id) ?? []).sort();
    node.days = Array.from(nodeDaysMap.get(node.id) ?? []).sort();
    classCounts[node.nodeClass] = (classCounts[node.nodeClass] ?? 0) + 1;
  }

  const relationCounts: Record<string, number> = {};
  for (const edge of edges) {
    relationCounts[edge.type] = (relationCounts[edge.type] ?? 0) + 1;
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    classCounts,
    relationCounts,
  };
}
