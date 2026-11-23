export type NodeClass = '축제' | '일자' | '연예인' | '학생참여주체' | '조직';

export type RelationType = 'HAS_DAY' | 'PERFORMED_IN' | 'OPERATED_BOOTH_IN';

export interface GraphNode {
  id: string;
  identity: number | string;
  elementId: string;
  labels: string[];
  nodeClass: NodeClass;
  name: string;
  properties: Record<string, unknown>;
  years: number[];
  days: string[];
  degree: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  identity: number | string;
  elementId: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
}

export interface ParsedKnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  classCounts: Record<NodeClass, number>;
  relationCounts: Record<string, number>;
}

export const NODE_CLASSES: NodeClass[] = [
  '축제',
  '일자',
  '연예인',
  '학생참여주체',
  '조직',
];

export const NODE_CLASS_META: Record<
  NodeClass,
  {
    color: string;
    ring: string;
    radius: number;
    description: string;
  }
> = {
  축제: {
    color: '#E11D48',
    ring: '#FDA4AF',
    radius: 17,
    description: '연도별 석탑대동제(KUdyssey, Kulimax)',
  },
  일자: {
    color: '#F59E0B',
    ring: '#FDE68A',
    radius: 12,
    description: '각 축제의 1일차~3일차 일정 단위',
  },
  연예인: {
    color: '#38BDF8',
    ring: '#BAE6FD',
    radius: 8,
    description: '무대 공연 초청 아티스트 및 장르 정보',
  },
  학생참여주체: {
    color: '#34D399',
    ring: '#A7F3D0',
    radius: 7.5,
    description: '동아리·단과대·학생회 등 학생 공연 및 부스 주체',
  },
  조직: {
    color: '#C084FC',
    ring: '#E9D5FF',
    radius: 8.5,
    description: '외부 기업·기관·브랜드 등 부스 운영 조직',
  },
};

export const RELATION_TYPE_META: Record<
  RelationType,
  {
    color: string;
    label: string;
    summary: string;
  }
> = {
  HAS_DAY: {
    color: '#F59E0B',
    label: '축제 → 일자',
    summary: '연도별 축제가 포함하는 세부 행사 일자를 연결',
  },
  PERFORMED_IN: {
    color: '#38BDF8',
    label: '연예인 또는 학생참여주체 → 일자',
    summary: '해당 일자에 무대 공연을 진행한 참여 주체를 연결',
  },
  OPERATED_BOOTH_IN: {
    color: '#C084FC',
    label: '조직 또는 학생참여주체 → 일자',
    summary: '해당 일자에 부스를 운영한 조직 및 학생 주체를 연결',
  },
};
