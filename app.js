(function () {
  'use strict';

  var NODE_CLASSES = ['축제', '일자', '연예인', '학생참여주체', '조직'];

  var NODE_CLASS_META = {
    축제: { color: '#E11D48', ring: '#FDA4AF', radius: 17 },
    일자: { color: '#F59E0B', ring: '#FDE68A', radius: 12 },
    연예인: { color: '#38BDF8', ring: '#BAE6FD', radius: 8 },
    학생참여주체: { color: '#34D399', ring: '#A7F3D0', radius: 7.5 },
    조직: { color: '#C084FC', ring: '#E9D5FF', radius: 8.5 },
  };

  var state = {
    graph: null,
    nodeById: new Map(),
    adjacencyByNodeId: new Map(),
    classFilter: '전체',
    yearFilter: '전체',
    dayFilter: '전체',
    searchQuery: '',
    selectedNodeId: null,
    hoveredNodeId: null,
    sourceLabel: 'data/neo4j-data.json',
    visibleNodes: [],
    visibleEdges: [],
    primaryMatchedIds: new Set(),
    isFiltered: false,
    simNodes: [],
    simLinks: [],
    simulation: null,
    zoomBehavior: null,
    nodesSel: null,
    labelsSel: null,
    linksSel: null,
  };

  function tryParseJson(value) {
    if (typeof value !== 'string') return value;
    var trimmed = value.trim();
    if (
      (trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length - 1) === '}') ||
      (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length - 1) === ']')
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (_e) {
        return value;
      }
    }
    return value;
  }

  function deepParseValue(value, depth) {
    var d = depth || 0;
    if (d > 4) return value;
    var parsed = tryParseJson(value);
    if (Array.isArray(parsed)) {
      return parsed.map(function (item) {
        return deepParseValue(item, d + 1);
      });
    }
    if (parsed && typeof parsed === 'object') {
      var out = {};
      Object.keys(parsed).forEach(function (k) {
        out[k] = deepParseValue(parsed[k], d + 1);
      });
      return out;
    }
    return parsed;
  }

  function resolveNodeClass(raw) {
    var candidate =
      (raw.labels && raw.labels[0]) ||
      (raw.properties && typeof raw.properties.class === 'string'
        ? raw.properties.class
        : '');
    if (NODE_CLASSES.indexOf(candidate) !== -1) {
      return candidate;
    }
    return '조직';
  }

  function extractDayLabel(dayName) {
    var match = String(dayName).match(/day\s*([123])/i);
    return match ? 'Day ' + match[1] : null;
  }

  function extractYearFromDayName(dayName) {
    var match = String(dayName).match(/(20\d{2})/);
    return match ? Number(match[1]) : null;
  }

  function parseNeo4jJson(rawInput) {
    var parsedRoot = deepParseValue(rawInput, 0);
    if (!Array.isArray(parsedRoot)) {
      throw new Error('JSON 최상위 구조가 Neo4j Export 배열이 아닙니다.');
    }

    var nodeMap = new Map();
    var identityToNodeId = new Map();
    var rawEdges = [];
    var edgeSeen = new Set();

    function registerNode(candidate) {
      var parsedNode = deepParseValue(candidate, 0);
      if (!parsedNode || typeof parsedNode !== 'object') return;
      if (
        parsedNode.elementId === undefined &&
        parsedNode.identity === undefined &&
        !parsedNode.properties
      ) {
        return;
      }

      var key =
        parsedNode.elementId !== undefined
          ? String(parsedNode.elementId)
          : 'id:' + String(parsedNode.identity);

      if (!nodeMap.has(key)) {
        var props =
          parsedNode.properties && typeof parsedNode.properties === 'object'
            ? Object.assign({}, parsedNode.properties)
            : {};
        var nodeClass = resolveNodeClass(parsedNode);
        var displayName =
          typeof props.name === 'string' && props.name.length > 0
            ? props.name
            : typeof props.id === 'string'
              ? props.id
              : key;

        nodeMap.set(key, {
          id: key,
          identity: parsedNode.identity !== undefined ? parsedNode.identity : key,
          elementId: parsedNode.elementId ? String(parsedNode.elementId) : key,
          labels: Array.isArray(parsedNode.labels)
            ? parsedNode.labels.slice()
            : [nodeClass],
          nodeClass: nodeClass,
          name: displayName,
          properties: props,
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
    }

    function registerRelation(candidate) {
      var rel = deepParseValue(candidate, 0);
      if (!rel || typeof rel !== 'object' || !rel.type) return;

      var relKey =
        rel.elementId !== undefined
          ? String(rel.elementId)
          : String(rel.start) +
            '->' +
            String(rel.type) +
            '->' +
            String(rel.end) +
            ':' +
            String(rel.identity !== undefined ? rel.identity : '');

      if (edgeSeen.has(relKey)) return;
      edgeSeen.add(relKey);
      rawEdges.push(rel);
    }

    parsedRoot.forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      if ('source' in row || 'target' in row || 'relation' in row) {
        if (row.source) registerNode(row.source);
        if (row.target) registerNode(row.target);
        if (row.relation) registerRelation(row.relation);
      } else {
        Object.keys(row).forEach(function (k) {
          var val = row[k];
          if (!val || typeof val !== 'object') return;
          if ('labels' in val) {
            registerNode(val);
          } else if (
            'type' in val &&
            ('start' in val || 'startNodeElementId' in val)
          ) {
            registerRelation(val);
          }
        });
      }
    });

    var edges = [];
    rawEdges.forEach(function (rel) {
      var startLookup =
        rel.startNodeElementId !== undefined
          ? String(rel.startNodeElementId)
          : rel.start !== undefined
            ? String(rel.start)
            : '';
      var endLookup =
        rel.endNodeElementId !== undefined
          ? String(rel.endNodeElementId)
          : rel.end !== undefined
            ? String(rel.end)
            : '';

      var sourceId = nodeMap.has(startLookup)
        ? startLookup
        : identityToNodeId.get(startLookup);
      var targetId = nodeMap.has(endLookup)
        ? endLookup
        : identityToNodeId.get(endLookup);

      if (!sourceId || !targetId) return;

      var edgeKey =
        rel.elementId !== undefined
          ? String(rel.elementId)
          : sourceId +
            '-' +
            rel.type +
            '-' +
            targetId +
            '-' +
            String(rel.identity !== undefined ? rel.identity : edges.length);

      edges.push({
        id: edgeKey,
        identity: rel.identity !== undefined ? rel.identity : edgeKey,
        elementId: rel.elementId ? String(rel.elementId) : edgeKey,
        type: rel.type || 'RELATED_TO',
        sourceId: sourceId,
        targetId: targetId,
        properties:
          rel.properties && typeof rel.properties === 'object'
            ? Object.assign({}, rel.properties)
            : {},
      });

      var sNode = nodeMap.get(sourceId);
      var tNode = nodeMap.get(targetId);
      if (sNode) sNode.degree += 1;
      if (tNode) tNode.degree += 1;
    });

    var dayYearMap = new Map();
    var dayLabelMap = new Map();
    var nodeYearsMap = new Map();
    var nodeDaysMap = new Map();

    function addYear(nodeId, year) {
      if (!nodeYearsMap.has(nodeId)) nodeYearsMap.set(nodeId, new Set());
      nodeYearsMap.get(nodeId).add(year);
    }

    function addDay(nodeId, day) {
      if (!nodeDaysMap.has(nodeId)) nodeDaysMap.set(nodeId, new Set());
      nodeDaysMap.get(nodeId).add(day);
    }

    nodeMap.forEach(function (node) {
      if (
        node.nodeClass === '축제' &&
        typeof node.properties.year === 'number'
      ) {
        addYear(node.id, node.properties.year);
      }
      if (node.nodeClass === '일자') {
        var label = extractDayLabel(node.name);
        if (label) {
          dayLabelMap.set(node.id, label);
          addDay(node.id, label);
        }
        var yr = extractYearFromDayName(node.name);
        if (yr) {
          dayYearMap.set(node.id, yr);
          addYear(node.id, yr);
        }
      }
    });

    edges.forEach(function (edge) {
      if (edge.type === 'HAS_DAY') {
        var fest = nodeMap.get(edge.sourceId);
        var day = nodeMap.get(edge.targetId);
        if (fest && day) {
          var yr =
            typeof fest.properties.year === 'number'
              ? fest.properties.year
              : dayYearMap.get(day.id);
          if (yr) {
            dayYearMap.set(day.id, yr);
            addYear(day.id, yr);
            addYear(fest.id, yr);
          }
          var dLabel = dayLabelMap.get(day.id);
          if (dLabel) {
            addDay(fest.id, dLabel);
          }
        }
      }
    });

    edges.forEach(function (edge) {
      if (edge.type !== 'HAS_DAY') {
        var source = nodeMap.get(edge.sourceId);
        var target = nodeMap.get(edge.targetId);
        if (!source || !target) return;
        if (target.nodeClass === '일자') {
          var tYr = dayYearMap.get(target.id);
          var tLabel = dayLabelMap.get(target.id);
          if (tYr) addYear(source.id, tYr);
          if (tLabel) addDay(source.id, tLabel);
        } else if (source.nodeClass === '일자') {
          var sYr = dayYearMap.get(source.id);
          var sLabel = dayLabelMap.get(source.id);
          if (sYr) addYear(target.id, sYr);
          if (sLabel) addDay(target.id, sLabel);
        }
      }
    });

    var classCounts = {
      축제: 0,
      일자: 0,
      연예인: 0,
      학생참여주체: 0,
      조직: 0,
    };

    nodeMap.forEach(function (node) {
      node.years = Array.from(nodeYearsMap.get(node.id) || []).sort();
      node.days = Array.from(nodeDaysMap.get(node.id) || []).sort();
      classCounts[node.nodeClass] = (classCounts[node.nodeClass] || 0) + 1;
    });

    var relationCounts = {};
    edges.forEach(function (edge) {
      relationCounts[edge.type] = (relationCounts[edge.type] || 0) + 1;
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edges,
      classCounts: classCounts,
      relationCounts: relationCounts,
    };
  }

  function buildLookups(graph) {
    var nMap = new Map();
    var adj = new Map();
    graph.nodes.forEach(function (n) {
      nMap.set(n.id, n);
      adj.set(n.id, []);
    });
    graph.edges.forEach(function (edge) {
      var s = nMap.get(edge.sourceId);
      var t = nMap.get(edge.targetId);
      if (!s || !t) return;
      adj.get(s.id).push({ edge: edge, other: t, direction: 'out' });
      adj.get(t.id).push({ edge: edge, other: s, direction: 'in' });
    });
    state.nodeById = nMap;
    state.adjacencyByNodeId = adj;
  }

  function updateSummaryNumbers() {
    if (!state.graph) return;
    var nCount = state.graph.nodes.length;
    var eCount = state.graph.edges.length;

    var heroNode = document.getElementById('hero-node-count');
    var heroEdge = document.getElementById('hero-edge-count');
    var modelNode = document.getElementById('model-node-total');
    var modelEdge = document.getElementById('model-edge-total');
    var summary = document.getElementById('kg-total-summary');
    var srcLabel = document.getElementById('kg-source-label');

    if (heroNode) heroNode.textContent = String(nCount);
    if (heroEdge) heroEdge.textContent = String(eCount);
    if (modelNode) modelNode.textContent = String(nCount);
    if (modelEdge) modelEdge.textContent = String(eCount);
    if (summary) {
      summary.textContent =
        '전체 노드 ' + nCount + '개 · 관계 ' + eCount + '개';
    }
    if (srcLabel) srcLabel.textContent = state.sourceLabel;

    NODE_CLASSES.forEach(function (cls) {
      var el = document.querySelector('[data-class-count="' + cls + '"]');
      if (el) el.textContent = String(state.graph.classCounts[cls] || 0) + '개';
    });

    Object.keys(state.graph.relationCounts).forEach(function (rel) {
      var el = document.querySelector('[data-rel-count="' + rel + '"]');
      if (el) el.textContent = String(state.graph.relationCounts[rel] || 0);
    });

    renderLegend();
  }

  function renderLegend() {
    var container = document.getElementById('kg-legend-items');
    if (!container) return;
    container.textContent = '';
    NODE_CLASSES.forEach(function (cls) {
      var item = document.createElement('div');
      item.className = 'kg-legend-item';

      var dot = document.createElement('span');
      dot.className = 'kg-legend-dot';
      dot.style.background = NODE_CLASS_META[cls].color;

      var nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = '500';
      nameSpan.textContent = cls;

      var countSpan = document.createElement('span');
      countSpan.className = 'mono tabular-nums';
      countSpan.style.color = '#A89B96';
      var cnt = state.graph ? state.graph.classCounts[cls] || 0 : 0;
      countSpan.textContent = '(' + cnt + ')';

      item.appendChild(dot);
      item.appendChild(nameSpan);
      item.appendChild(countSpan);
      container.appendChild(item);
    });
  }

  function computeFilteredSubgraph() {
    if (!state.graph) {
      state.visibleNodes = [];
      state.visibleEdges = [];
      state.isFiltered = false;
      state.primaryMatchedIds = new Set();
      return;
    }

    var q = state.searchQuery.trim().toLowerCase();
    var hasFilter =
      state.classFilter !== '전체' ||
      state.yearFilter !== '전체' ||
      state.dayFilter !== '전체' ||
      q.length > 0;

    if (!hasFilter) {
      state.visibleNodes = state.graph.nodes;
      state.visibleEdges = state.graph.edges;
      state.isFiltered = false;
      state.primaryMatchedIds = new Set(
        state.graph.nodes.map(function (n) {
          return n.id;
        })
      );
      return;
    }

    var activeYear =
      state.yearFilter === '전체' ? null : Number(state.yearFilter);

    function matchesYearAndDay(n) {
      if (activeYear !== null && n.years.indexOf(activeYear) === -1) {
        return false;
      }
      if (state.dayFilter !== '전체' && n.days.indexOf(state.dayFilter) === -1) {
        return false;
      }
      return true;
    }

    var primaryIds = new Set();
    state.graph.nodes.forEach(function (node) {
      if (state.classFilter !== '전체' && node.nodeClass !== state.classFilter) {
        return;
      }
      if (!matchesYearAndDay(node)) return;
      if (q.length > 0) {
        var propValues = Object.keys(node.properties).map(function (k) {
          return String(node.properties[k] !== undefined ? node.properties[k] : '');
        });
        var haystack = [node.name, node.nodeClass]
          .concat(propValues)
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(q) === -1) return;
      }
      primaryIds.add(node.id);
    });

    var includedIds = new Set(primaryIds);

    state.graph.edges.forEach(function (edge) {
      var s = state.nodeById.get(edge.sourceId);
      var t = state.nodeById.get(edge.targetId);
      if (!s || !t) return;
      if (primaryIds.has(s.id) && t.nodeClass === '일자' && matchesYearAndDay(t)) {
        includedIds.add(t.id);
      }
      if (primaryIds.has(t.id) && s.nodeClass === '일자' && matchesYearAndDay(s)) {
        includedIds.add(s.id);
      }
    });

    state.graph.edges.forEach(function (edge) {
      if (edge.type !== 'HAS_DAY') return;
      var fest = state.nodeById.get(edge.sourceId);
      var day = state.nodeById.get(edge.targetId);
      if (!fest || !day) return;
      if (
        includedIds.has(day.id) &&
        (activeYear === null || fest.years.indexOf(activeYear) !== -1)
      ) {
        includedIds.add(fest.id);
      }
      if (primaryIds.has(fest.id) && matchesYearAndDay(day)) {
        includedIds.add(day.id);
      }
    });

    state.visibleNodes = state.graph.nodes.filter(function (n) {
      return includedIds.has(n.id);
    });
    state.visibleEdges = state.graph.edges.filter(function (e) {
      return includedIds.has(e.sourceId) && includedIds.has(e.targetId);
    });
    state.isFiltered = true;
    state.primaryMatchedIds = primaryIds;
  }

  function updateVisibleBadge() {
    var badge = document.getElementById('kg-visible-badge');
    var clearBtn = document.getElementById('kg-clear-filters-btn');
    if (badge && state.graph) {
      badge.textContent =
        '표시: 노드 ' +
        state.visibleNodes.length +
        '/' +
        state.graph.nodes.length +
        '개 · 관계 ' +
        state.visibleEdges.length +
        '/' +
        state.graph.edges.length +
        '개';
    }
    if (clearBtn) {
      clearBtn.hidden = !state.isFiltered;
    }
  }

  function renderHoverCard() {
    var card = document.getElementById('kg-hover-card');
    if (!card) return;
    if (!state.hoveredNodeId) {
      card.hidden = true;
      card.textContent = '';
      return;
    }
    var node = state.nodeById.get(state.hoveredNodeId);
    if (!node) {
      card.hidden = true;
      return;
    }
    card.textContent = '';

    var topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '0.45rem';

    var dot = document.createElement('span');
    dot.className = 'kg-legend-dot';
    dot.style.background = NODE_CLASS_META[node.nodeClass].color;
    dot.style.flexShrink = '0';

    var nameEl = document.createElement('strong');
    nameEl.textContent = node.name;

    var clsEl = document.createElement('span');
    clsEl.style.color = '#D7CCC8';
    clsEl.style.fontSize = '0.6875rem';
    clsEl.textContent = '(' + node.nodeClass + ')';

    topRow.appendChild(dot);
    topRow.appendChild(nameEl);
    topRow.appendChild(clsEl);

    var sub = document.createElement('div');
    sub.className = 'mono';
    sub.style.marginTop = '0.25rem';
    sub.style.fontSize = '0.6875rem';
    sub.style.color = '#C5B8B2';
    sub.textContent =
      '연결 관계 ' + node.degree + '개 · 클릭하여 상세 보기';

    card.appendChild(topRow);
    card.appendChild(sub);
    card.hidden = false;
  }

  function renderDetailPanel() {
    var panel = document.getElementById('kg-detail-panel');
    if (!panel) return;
    panel.textContent = '';

    var selectedNode = state.selectedNodeId
      ? state.nodeById.get(state.selectedNodeId)
      : null;

    if (!selectedNode) {
      var emptyWrap = document.createElement('div');
      emptyWrap.style.display = 'flex';
      emptyWrap.style.flexDirection = 'column';
      emptyWrap.style.justifyContent = 'space-between';
      emptyWrap.style.height = '100%';
      emptyWrap.style.padding = '1.5rem';

      var topBox = document.createElement('div');
      var title = document.createElement('h4');
      title.className = 'serif';
      title.style.fontSize = '1.125rem';
      title.style.fontWeight = '700';
      title.style.color = '#FFFDF9';
      title.textContent = '노드를 선택해 세부 정보를 확인하세요';

      var desc = document.createElement('p');
      desc.style.marginTop = '0.6rem';
      desc.style.fontSize = '0.75rem';
      desc.style.lineHeight = '1.7';
      desc.style.color = '#D7CCC8';
      desc.textContent =
        '왼쪽 네트워크 그래프에서 원하는 노드를 클릭하면 해당 노드의 모든 속성(id, genre, industry, orgType 등)과 연결 관계 수, 이웃 노드를 이곳에서 탐색할 수 있습니다.';

      topBox.appendChild(title);
      topBox.appendChild(desc);

      var statsBox = document.createElement('div');
      statsBox.style.marginTop = '1.5rem';
      statsBox.style.borderRadius = '0.75rem';
      statsBox.style.border = '1px solid rgba(255,255,255,0.1)';
      statsBox.style.background = 'rgba(0,0,0,0.22)';
      statsBox.style.padding = '1rem';
      statsBox.style.fontSize = '0.75rem';

      var sTitle = document.createElement('div');
      sTitle.style.fontWeight = '600';
      sTitle.style.color = '#FFFDF9';
      sTitle.style.marginBottom = '0.5rem';
      sTitle.textContent = '데이터 요약';
      statsBox.appendChild(sTitle);

      var totalNodes = state.graph ? state.graph.nodes.length : 0;
      var totalEdges = state.graph ? state.graph.edges.length : 0;

      [
        ['전체 노드', totalNodes + '개', '#FFFDF9'],
        ['전체 관계', totalEdges + '개', '#FFFDF9'],
        [
          '현재 표시 중',
          '노드 ' +
            state.visibleNodes.length +
            '개 · 관계 ' +
            state.visibleEdges.length +
            '개',
          '#FDA4AF',
        ],
      ].forEach(function (row) {
        var line = document.createElement('div');
        line.style.display = 'flex';
        line.style.justifyContent = 'space-between';
        line.style.marginTop = '0.35rem';
        line.style.color = '#D7CCC8';

        var lSpan = document.createElement('span');
        lSpan.textContent = row[0];
        var rSpan = document.createElement('span');
        rSpan.className = 'mono tabular-nums';
        rSpan.style.color = row[2];
        rSpan.textContent = row[1];

        line.appendChild(lSpan);
        line.appendChild(rSpan);
        statsBox.appendChild(line);
      });

      emptyWrap.appendChild(topBox);
      emptyWrap.appendChild(statsBox);
      panel.appendChild(emptyWrap);
      return;
    }

    var connections = state.adjacencyByNodeId.get(selectedNode.id) || [];

    var head = document.createElement('div');
    head.className = 'kg-detail-head';

    var headTop = document.createElement('div');
    headTop.style.display = 'flex';
    headTop.style.justifyContent = 'space-between';
    headTop.style.alignItems = 'flex-start';
    headTop.style.gap = '0.75rem';

    var titleWrap = document.createElement('div');
    var classBadge = document.createElement('span');
    classBadge.className = 'mono';
    classBadge.style.display = 'inline-flex';
    classBadge.style.alignItems = 'center';
    classBadge.style.gap = '0.4rem';
    classBadge.style.fontSize = '0.75rem';
    classBadge.style.color = '#EDE5DC';

    var cDot = document.createElement('span');
    cDot.className = 'kg-legend-dot';
    cDot.style.background = NODE_CLASS_META[selectedNode.nodeClass].color;
    classBadge.appendChild(cDot);
    classBadge.appendChild(document.createTextNode(selectedNode.nodeClass));

    var h4 = document.createElement('h4');
    h4.className = 'serif';
    h4.style.marginTop = '0.4rem';
    h4.style.fontSize = '1.25rem';
    h4.style.fontWeight = '700';
    h4.style.color = '#FFFDF9';
    h4.textContent = selectedNode.name;

    titleWrap.appendChild(classBadge);
    titleWrap.appendChild(h4);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kg-zoom-btn';
    closeBtn.setAttribute('aria-label', '선택 해제');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function () {
      state.selectedNodeId = null;
      applyHighlightStyles();
      renderDetailPanel();
    });

    headTop.appendChild(titleWrap);
    headTop.appendChild(closeBtn);
    head.appendChild(headTop);

    var metaRow = document.createElement('div');
    metaRow.className = 'mono';
    metaRow.style.display = 'flex';
    metaRow.style.flexWrap = 'wrap';
    metaRow.style.gap = '0.7rem';
    metaRow.style.marginTop = '0.75rem';
    metaRow.style.fontSize = '0.75rem';
    metaRow.style.color = '#D7CCC8';

    var relCountChip = document.createElement('span');
    relCountChip.className = 'tabular-nums';
    relCountChip.style.background = 'rgba(255,255,255,0.08)';
    relCountChip.style.color = '#FFFDF9';
    relCountChip.style.padding = '0.25rem 0.6rem';
    relCountChip.style.borderRadius = '0.4rem';
    relCountChip.textContent = '연결 관계 ' + connections.length + '개';
    metaRow.appendChild(relCountChip);

    if (selectedNode.years.length > 0) {
      var yrSpan = document.createElement('span');
      yrSpan.className = 'tabular-nums';
      yrSpan.style.paddingTop = '0.25rem';
      yrSpan.textContent = '연도: ' + selectedNode.years.join(', ');
      metaRow.appendChild(yrSpan);
    }

    head.appendChild(metaRow);
    panel.appendChild(head);

    var body = document.createElement('div');
    body.className = 'kg-detail-body';

    var propTitle = document.createElement('h5');
    propTitle.className = 'mono';
    propTitle.style.fontSize = '0.6875rem';
    propTitle.style.color = '#C5B8B2';
    propTitle.style.letterSpacing = '0.06em';
    propTitle.textContent = '노드 속성 (PROPERTIES)';

    var propBox = document.createElement('dl');
    propBox.className = 'kg-props-box';

    Object.keys(selectedNode.properties).forEach(function (key) {
      var row = document.createElement('div');
      row.className = 'kg-prop-row';
      var dt = document.createElement('dt');
      dt.textContent = key;
      var dd = document.createElement('dd');
      dd.textContent = String(selectedNode.properties[key]);
      row.appendChild(dt);
      row.appendChild(dd);
      propBox.appendChild(row);
    });

    var propSection = document.createElement('div');
    propSection.appendChild(propTitle);
    propSection.appendChild(propBox);
    body.appendChild(propSection);

    var relSection = document.createElement('div');
    var relTitle = document.createElement('h5');
    relTitle.className = 'mono';
    relTitle.style.fontSize = '0.6875rem';
    relTitle.style.color = '#C5B8B2';
    relTitle.style.letterSpacing = '0.06em';
    relTitle.textContent = '연결된 관계 (' + connections.length + ')';

    var relList = document.createElement('ul');
    relList.className = 'kg-neighbor-list';

    connections.forEach(function (conn) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kg-neighbor-btn';

      var left = document.createElement('div');
      left.style.minWidth = '0';
      left.style.flex = '1';

      var nTop = document.createElement('div');
      nTop.style.display = 'flex';
      nTop.style.alignItems = 'center';
      nTop.style.gap = '0.4rem';

      var nDot = document.createElement('span');
      nDot.className = 'kg-legend-dot';
      nDot.style.background = NODE_CLASS_META[conn.other.nodeClass].color;
      nDot.style.flexShrink = '0';

      var nName = document.createElement('span');
      nName.style.fontWeight = '600';
      nName.textContent = conn.other.name;

      nTop.appendChild(nDot);
      nTop.appendChild(nName);

      var nSub = document.createElement('div');
      nSub.className = 'mono';
      nSub.style.marginTop = '0.15rem';
      nSub.style.fontSize = '0.625rem';
      nSub.style.color = '#B8ABA5';
      nSub.textContent =
        (conn.direction === 'out' ? '→ ' : '← ') +
        conn.edge.type +
        ' · ' +
        conn.other.nodeClass;

      left.appendChild(nTop);
      left.appendChild(nSub);

      var go = document.createElement('span');
      go.style.color = '#C5B8B2';
      go.style.flexShrink = '0';
      go.textContent = '이동';

      btn.appendChild(left);
      btn.appendChild(go);
      btn.addEventListener('click', function () {
        state.selectedNodeId = conn.other.id;
        applyHighlightStyles();
        renderDetailPanel();
      });

      li.appendChild(btn);
      relList.appendChild(li);
    });

    relSection.appendChild(relTitle);
    relSection.appendChild(relList);
    body.appendChild(relSection);
    panel.appendChild(body);
  }

  function applyHighlightStyles() {
    if (!state.nodesSel || !state.labelsSel || !state.linksSel) return;

    var focusId = state.hoveredNodeId || state.selectedNodeId;
    var neighborIds = new Set();
    var activeEdgeIds = new Set();

    if (focusId) {
      neighborIds.add(focusId);
      state.simLinks.forEach(function (link) {
        if (link.sourceId === focusId || link.targetId === focusId) {
          activeEdgeIds.add(link.id);
          neighborIds.add(link.sourceId);
          neighborIds.add(link.targetId);
        }
      });
    }

    state.nodesSel
      .attr('opacity', function (d) {
        if (!focusId) return 1;
        return neighborIds.has(d.id) ? 1 : 0.16;
      })
      .attr('stroke', function (d) {
        if (d.id === state.selectedNodeId) return '#FFFDF9';
        if (d.id === state.hoveredNodeId) {
          return NODE_CLASS_META[d.nodeClass].ring;
        }
        return '#151013';
      })
      .attr('stroke-width', function (d) {
        if (d.id === state.selectedNodeId || d.id === state.hoveredNodeId) {
          return 3;
        }
        return 1.6;
      });

    state.linksSel
      .attr('stroke-opacity', function (d) {
        if (!focusId) return 1;
        return activeEdgeIds.has(d.id) ? 0.95 : 0.08;
      })
      .attr('stroke-width', function (d) {
        if (focusId && activeEdgeIds.has(d.id)) return 2.4;
        return d.type === 'HAS_DAY' ? 2 : 1.15;
      });

    state.labelsSel.attr('opacity', function (d) {
      if (focusId) {
        return neighborIds.has(d.id) ? 1 : 0;
      }
      if (d.nodeClass === '축제' || d.nodeClass === '일자') return 0.95;
      if (state.isFiltered && state.visibleNodes.length <= 45) return 0.9;
      if (
        state.isFiltered &&
        state.primaryMatchedIds.has(d.id) &&
        state.visibleNodes.length <= 80
      ) {
        return 0.85;
      }
      return 0;
    });
  }

  function renderGraph() {
    var d3 = window.d3;
    var svgEl = document.getElementById('kg-svg');
    var wrapEl = document.getElementById('kg-canvas-wrap');
    var emptyEl = document.getElementById('kg-empty-state');
    var loadingEl = document.getElementById('kg-loading-state');
    var zoomPctEl = document.getElementById('kg-zoom-pct');

    if (loadingEl) loadingEl.hidden = true;
    if (!d3 || !svgEl || !wrapEl) return;

    if (state.simulation) {
      state.simulation.stop();
      state.simulation = null;
    }

    var svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (state.visibleNodes.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      state.simNodes = [];
      state.simLinks = [];
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    var width = wrapEl.clientWidth || 820;
    var height = wrapEl.clientHeight || 560;

    var prevPos = new Map();
    state.simNodes.forEach(function (prev) {
      prevPos.set(prev.id, { x: prev.x, y: prev.y });
    });

    var simNodes = state.visibleNodes.map(function (n, idx) {
      var old = prevPos.get(n.id);
      var angle = (idx / Math.max(1, state.visibleNodes.length)) * Math.PI * 2;
      var spread =
        n.nodeClass === '축제' ? 90 : n.nodeClass === '일자' ? 160 : 240;
      return Object.assign({}, n, {
        x: old ? old.x : width / 2 + Math.cos(angle) * spread,
        y: old ? old.y : height / 2 + Math.sin(angle) * spread,
      });
    });

    var simNodeById = new Map();
    simNodes.forEach(function (n) {
      simNodeById.set(n.id, n);
    });

    var simLinks = [];
    state.visibleEdges.forEach(function (e) {
      var s = simNodeById.get(e.sourceId);
      var t = simNodeById.get(e.targetId);
      if (!s || !t) return;
      simLinks.push({
        id: e.id,
        type: e.type,
        sourceId: e.sourceId,
        targetId: e.targetId,
        source: s,
        target: t,
      });
    });

    state.simNodes = simNodes;
    state.simLinks = simLinks;

    var rootG = svg.append('g').attr('class', 'graph-viewport');

    var zoom = d3
      .zoom()
      .scaleExtent([0.25, 4.5])
      .on('zoom', function (event) {
        rootG.attr('transform', event.transform.toString());
        if (zoomPctEl) {
          zoomPctEl.textContent = Math.round(event.transform.k * 100) + '%';
        }
      });

    state.zoomBehavior = zoom;
    svg.call(zoom);

    svg.on('click', function (event) {
      if (event.target === svgEl) {
        state.selectedNodeId = null;
        applyHighlightStyles();
        renderDetailPanel();
      }
    });

    var linkGroup = rootG.append('g');
    var nodeGroup = rootG.append('g');
    var labelGroup = rootG.append('g');

    var linksSel = linkGroup
      .selectAll('line')
      .data(simLinks, function (d) {
        return d.id;
      })
      .join('line')
      .attr('stroke', function (d) {
        if (d.type === 'HAS_DAY') return 'rgba(245, 158, 11, 0.48)';
        if (d.type === 'PERFORMED_IN') return 'rgba(56, 189, 248, 0.34)';
        return 'rgba(192, 132, 252, 0.30)';
      })
      .attr('stroke-width', function (d) {
        return d.type === 'HAS_DAY' ? 2 : 1.15;
      });

    var simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id(function (d) {
            return d.id;
          })
          .distance(function (d) {
            return d.type === 'HAS_DAY' ? 76 : 105;
          })
          .strength(function (d) {
            return d.type === 'HAS_DAY' ? 0.75 : 0.45;
          })
      )
      .force(
        'charge',
        d3.forceManyBody().strength(function (d) {
          if (d.nodeClass === '축제') return -420;
          if (d.nodeClass === '일자') return -280;
          return -115;
        })
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide().radius(function (d) {
          return NODE_CLASS_META[d.nodeClass].radius + 8;
        })
      )
      .force('x', d3.forceX(width / 2).strength(0.055))
      .force('y', d3.forceY(height / 2).strength(0.055));

    var dragBehavior = d3
      .drag()
      .on('start', function (event, d) {
        if (!event.active) simulation.alphaTarget(0.28).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    var nodesSel = nodeGroup
      .selectAll('circle')
      .data(simNodes, function (d) {
        return d.id;
      })
      .join('circle')
      .attr('r', function (d) {
        return NODE_CLASS_META[d.nodeClass].radius;
      })
      .attr('fill', function (d) {
        return NODE_CLASS_META[d.nodeClass].color;
      })
      .attr('stroke', '#151013')
      .attr('stroke-width', 1.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        state.hoveredNodeId = d.id;
        applyHighlightStyles();
        renderHoverCard();
      })
      .on('mouseleave', function () {
        state.hoveredNodeId = null;
        applyHighlightStyles();
        renderHoverCard();
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        state.selectedNodeId = d.id;
        applyHighlightStyles();
        renderDetailPanel();
      })
      .call(dragBehavior);

    var labelsSel = labelGroup
      .selectAll('text')
      .data(simNodes, function (d) {
        return d.id;
      })
      .join('text')
      .text(function (d) {
        return d.name;
      })
      .attr('font-size', function (d) {
        if (d.nodeClass === '축제') return 13;
        if (d.nodeClass === '일자') return 11.5;
        return 10;
      })
      .attr('font-weight', function (d) {
        return d.nodeClass === '축제' || d.nodeClass === '일자' ? 600 : 500;
      })
      .attr('fill', '#F8F4F0')
      .attr('text-anchor', 'middle')
      .attr('dy', function (d) {
        return -(NODE_CLASS_META[d.nodeClass].radius + 6);
      })
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.9)');

    simulation.on('tick', function () {
      linksSel
        .attr('x1', function (d) {
          return d.source.x;
        })
        .attr('y1', function (d) {
          return d.source.y;
        })
        .attr('x2', function (d) {
          return d.target.x;
        })
        .attr('y2', function (d) {
          return d.target.y;
        });

      nodesSel
        .attr('cx', function (d) {
          return d.x;
        })
        .attr('cy', function (d) {
          return d.y;
        });

      labelsSel
        .attr('x', function (d) {
          return d.x;
        })
        .attr('y', function (d) {
          return d.y;
        });
    });

    state.simulation = simulation;
    state.nodesSel = nodesSel;
    state.labelsSel = labelsSel;
    state.linksSel = linksSel;

    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.92));
    if (zoomPctEl) zoomPctEl.textContent = '92%';

    applyHighlightStyles();
  }

  function syncFilterButtons() {
    document
      .querySelectorAll('#class-filter-group .filter-btn')
      .forEach(function (btn) {
        var active = btn.getAttribute('data-class') === state.classFilter;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

    document
      .querySelectorAll('#year-filter-group .filter-btn')
      .forEach(function (btn) {
        var active = btn.getAttribute('data-year') === state.yearFilter;
        btn.classList.toggle('is-selected-dark', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

    document
      .querySelectorAll('#day-filter-group .filter-btn')
      .forEach(function (btn) {
        var active = btn.getAttribute('data-day') === state.dayFilter;
        btn.classList.toggle('is-selected-dark', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
  }

  function applyFiltersAndRedraw() {
    syncFilterButtons();
    computeFilteredSubgraph();
    updateVisibleBadge();
    renderGraph();
    renderDetailPanel();
  }

  function resetFilters() {
    state.classFilter = '전체';
    state.yearFilter = '전체';
    state.dayFilter = '전체';
    state.searchQuery = '';
    state.selectedNodeId = null;
    var searchEl = document.getElementById('graph-search-input');
    if (searchEl) searchEl.value = '';
    applyFiltersAndRedraw();
  }

  function showError(msg) {
    var box = document.getElementById('kg-error-box');
    if (!box) return;
    if (!msg) {
      box.hidden = true;
      box.textContent = '';
    } else {
      box.textContent = msg;
      box.hidden = false;
    }
  }

  function loadParsedData(rawJson, label) {
    var parsed = parseNeo4jJson(rawJson);
    state.graph = parsed;
    state.sourceLabel = label;
    state.selectedNodeId = null;
    state.hoveredNodeId = null;
    buildLookups(parsed);
    updateSummaryNumbers();
    showError(null);
    applyFiltersAndRedraw();
  }

  function setupNavigationObserver() {
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll('[data-nav]')
    );
    var sectionIds = ['home', 'about', 'project', 'contact'];
    var elements = sectionIds
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!('IntersectionObserver' in window) || elements.length === 0) return;

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (e) {
            return e.isIntersecting;
          })
          .sort(function (a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          });
        if (visible.length === 0) return;
        var activeId = visible[0].target.id;
        navLinks.forEach(function (link) {
          var match = link.getAttribute('data-nav') === activeId;
          link.classList.toggle('is-active', match);
          if (match) {
            link.setAttribute('aria-current', 'location');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.05, 0.25, 0.5],
      }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  function bindUiEvents() {
    var classGroup = document.getElementById('class-filter-group');
    if (classGroup) {
      classGroup.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-class]');
        if (!btn) return;
        state.classFilter = btn.getAttribute('data-class') || '전체';
        applyFiltersAndRedraw();
      });
    }

    var yearGroup = document.getElementById('year-filter-group');
    if (yearGroup) {
      yearGroup.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-year]');
        if (!btn) return;
        state.yearFilter = btn.getAttribute('data-year') || '전체';
        applyFiltersAndRedraw();
      });
    }

    var dayGroup = document.getElementById('day-filter-group');
    if (dayGroup) {
      dayGroup.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-day]');
        if (!btn) return;
        state.dayFilter = btn.getAttribute('data-day') || '전체';
        applyFiltersAndRedraw();
      });
    }

    var searchInput = document.getElementById('graph-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = e.target.value || '';
        applyFiltersAndRedraw();
      });
    }

    var clearBtn = document.getElementById('kg-clear-filters-btn');
    if (clearBtn) clearBtn.addEventListener('click', resetFilters);

    var emptyResetBtn = document.getElementById('kg-empty-reset-btn');
    if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFilters);

    var uploadBtn = document.getElementById('kg-upload-btn');
    var fileInput = document.getElementById('kg-file-input');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var parsed = JSON.parse(String(reader.result));
            loadParsedData(parsed, file.name);
          } catch (err) {
            showError(
              'JSON 파일을 불러오지 못했습니다: ' +
                (err && err.message ? err.message : '형식 오류')
            );
          }
          fileInput.value = '';
        };
        reader.readAsText(file, 'utf-8');
      });
    }

    var zoomInBtn = document.getElementById('kg-zoom-in-btn');
    var zoomOutBtn = document.getElementById('kg-zoom-out-btn');
    var resetBtn = document.getElementById('kg-reset-btn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function () {
        var d3 = window.d3;
        var svgEl = document.getElementById('kg-svg');
        if (d3 && svgEl && state.zoomBehavior) {
          d3.select(svgEl)
            .transition()
            .duration(220)
            .call(state.zoomBehavior.scaleBy, 1.25);
        }
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function () {
        var d3 = window.d3;
        var svgEl = document.getElementById('kg-svg');
        if (d3 && svgEl && state.zoomBehavior) {
          d3.select(svgEl)
            .transition()
            .duration(220)
            .call(state.zoomBehavior.scaleBy, 0.8);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var d3 = window.d3;
        var svgEl = document.getElementById('kg-svg');
        if (d3 && svgEl && state.zoomBehavior) {
          d3.select(svgEl)
            .transition()
            .duration(260)
            .call(
              state.zoomBehavior.transform,
              d3.zoomIdentity.translate(0, 0).scale(0.92)
            );
        }
        if (state.simulation) {
          state.simNodes.forEach(function (n) {
            n.fx = null;
            n.fy = null;
          });
          state.simulation.alpha(0.45).restart();
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupNavigationObserver();
    bindUiEvents();
    renderDetailPanel();

    fetch('./data/neo4j-data.json')
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (raw) {
        loadParsedData(raw, 'data/neo4j-data.json');
      })
      .catch(function (err) {
        var loadingEl = document.getElementById('kg-loading-state');
        if (loadingEl) loadingEl.hidden = true;
        showError(
          '기본 지식그래프 데이터를 불러오지 못했습니다 (' +
            (err && err.message ? err.message : '네트워크 오류') +
            "). 상단의 'JSON 직접 불러오기' 버튼을 이용해 주세요."
        );
      });
  });
})();
