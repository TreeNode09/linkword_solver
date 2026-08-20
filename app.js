(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    mode: "chain",
    ready: false,
    initials: new Map(),
    finals: new Map(),
    explanations: new Map(),
    wordFreq: new Map(),
    charFreq: new Map(),
  };

  class Deque {
    constructor(items = []) {
      this.a = items.slice();
      this.h = 0;
    }
    get length() {
      return this.a.length - this.h;
    }
    push(x) {
      this.a.push(x);
    }
    popleft() {
      return this.a[this.h++];
    }
    items() {
      return this.a.slice(this.h);
    }
  }

  function addEdge(graph, from, to) {
    let set = graph.get(from);
    if (!set) {
      set = new Set();
      graph.set(from, set);
    }
    set.add(to);
  }

  function neighbors(graph, ch) {
    const set = graph.get(ch);
    return set ? set : emptySet;
  }

  const emptySet = new Set();

  function ingest(data) {
    state.initials = new Map();
    state.finals = new Map();
    state.explanations = new Map();
    state.wordFreq = new Map();
    state.charFreq = new Map();

    const { w, f, e, c, cf } = data;
    for (let i = 0; i < w.length; i++) {
      const word = w[i];
      addEdge(state.initials, word[0], word[1]);
      addEdge(state.finals, word[1], word[0]);
      state.wordFreq.set(word, f[i]);
      if (e[i]) state.explanations.set(word, e[i]);
    }
    for (let i = 0; i < c.length; i++) state.charFreq.set(c[i], cf[i]);
    state.ready = true;
  }

  function zipfWord(word) {
    const v = state.wordFreq.get(word);
    return v == null ? 0 : v;
  }

  function zipfChar(ch) {
    const v = state.charFreq.get(ch);
    return v == null ? 0 : v;
  }

  function explain(word) {
    return state.explanations.get(word) || "无。";
  }

  function explainLine(word) {
    const p = document.createElement("p");
    const b = document.createElement("b");
    b.textContent = word;
    p.append(b, "：" + explain(word));
    return p;
  }

  function searchLayer(searching, dist, parents, graph) {
    const n = searching.length;
    for (let i = 0; i < n; i++) {
      const current = searching.popleft();
      const nextDist = dist.get(current) + 1;
      for (const following of neighbors(graph, current)) {
        if (!dist.has(following)) {
          dist.set(following, nextDist);
          parents.set(following, [current]);
          searching.push(following);
        } else if (dist.get(following) === nextDist) {
          const list = parents.get(following);
          if (!list.includes(current)) list.push(current);
        }
      }
    }
  }

  function pathsFromRoot(node, parents) {
    if (!parents.has(node)) return [[node]];
    const paths = [];
    for (const prev of parents.get(node)) {
      for (const path of pathsFromRoot(prev, parents)) paths.push(path.concat(node));
    }
    return paths;
  }

  function combinePaths(meets, frontParents, backParents) {
    const paths = [];
    const seen = new Set();
    for (const meet of meets) {
      for (const front of pathsFromRoot(meet, frontParents)) {
        for (const back of pathsFromRoot(meet, backParents)) {
          const path = front.concat(back.slice().reverse().slice(1));
          const key = path.join("");
          if (!seen.has(key)) {
            seen.add(key);
            paths.push(path);
          }
        }
      }
    }
    return paths;
  }

  function twoWaySearch(start, end) {
    const src = start[1];
    const dst = end[0];
    if (src === dst) return [[]];

    const front = new Deque([src]);
    const back = new Deque([dst]);
    const frontDist = new Map([[src, 0]]);
    const backDist = new Map([[dst, 0]]);
    const frontParents = new Map();
    const backParents = new Map();
    let bestLen = Infinity;
    let meets = [];
    let frontDepth = 0;
    let backDepth = 0;

    while (front.length && back.length) {
      let frontier;
      let otherDist;
      if (front.length <= back.length) {
        searchLayer(front, frontDist, frontParents, state.initials);
        frontDepth += 1;
        frontier = front;
        otherDist = backDist;
      } else {
        searchLayer(back, backDist, backParents, state.finals);
        backDepth += 1;
        frontier = back;
        otherDist = frontDist;
      }

      for (const ch of frontier.items()) {
        if (!otherDist.has(ch)) continue;
        const total = frontDist.get(ch) + backDist.get(ch);
        if (total < bestLen) {
          bestLen = total;
          meets = [ch];
        } else if (total === bestLen) meets.push(ch);
      }

      if (meets.length && frontDepth + backDepth >= bestLen) {
        return combinePaths(meets, frontParents, backParents);
      }
    }
    return [];
  }

  function ladderSearchLayer(searching, lengths, parents, hold) {
    const graph = hold === 0 ? state.initials : state.finals;
    const n = searching.length;
    for (let i = 0; i < n; i++) {
      const current = searching.popleft();
      const nextLength = lengths[hold].get(current) + 1;
      for (const following of neighbors(graph, current)) {
        const other = lengths[1 - hold];
        if (!other.has(following)) {
          other.set(following, nextLength);
          parents[1 - hold].set(following, [current]);
          searching.push(following);
        } else if (other.get(following) === nextLength) {
          const list = parents[1 - hold].get(following);
          if (!list.includes(current)) list.push(current);
        }
      }
    }
  }

  function ladderPathsFromRoot(ch, pos, parents) {
    if (!parents[pos].has(ch)) return [[ch]];
    const paths = [];
    for (const prev of parents[pos].get(ch)) {
      for (const path of ladderPathsFromRoot(prev, 1 - pos, parents)) {
        paths.push(path.concat(ch));
      }
    }
    return paths;
  }

  function recoverWords(charPath, start, end, firstEditPos) {
    const words = [start];
    for (let k = 1; k < charPath.length; k++) {
      if ((firstEditPos + k - 1) % 2 === 0) words.push(charPath[k - 1] + charPath[k]);
      else words.push(charPath[k] + charPath[k - 1]);
    }
    if (words[words.length - 1] !== end) words.push(end);
    return words;
  }

  function pathSteps(charPath, start, end, firstEditPos) {
    return recoverWords(charPath, start, end, firstEditPos).length - 1;
  }

  function oneSideSearch(start, end, firstEditPos) {
    if (start === end) return [[]];
    const searching = new Deque([start[firstEditPos]]);
    const lengths = [new Map([[start[0], 0]]), new Map([[start[1], 0]])];
    const parents = [new Map(), new Map()];
    let hold = firstEditPos;

    while (searching.length) {
      ladderSearchLayer(searching, lengths, parents, hold);
      const target = end[1 - hold];
      if (searching.items().includes(target)) {
        const paths = [];
        const seen = new Set();
        for (const charPath of ladderPathsFromRoot(target, 1 - hold, parents)) {
          const key = charPath.join("");
          if (!seen.has(key)) {
            seen.add(key);
            paths.push(charPath);
          }
        }
        return paths;
      }
      hold = 1 - hold;
    }
    return [];
  }

  function ladderSearch(start, end) {
    const allPaths = [];
    const seen = new Set();
    for (const firstEditPos of [0, 1]) {
      for (const charPath of oneSideSearch(start, end, firstEditPos)) {
        const key = charPath.join("");
        if (!seen.has(key)) {
          seen.add(key);
          allPaths.push([firstEditPos, charPath]);
        }
      }
    }
    if (!allPaths.length) return [];
    const minSteps = Math.min(
      ...allPaths.map(([pos, p]) => pathSteps(p, start, end, pos)),
    );
    return allPaths.filter(([pos, p]) => pathSteps(p, start, end, pos) === minSteps);
  }

  function topByFreq(items, freqOf, limit) {
    return items
      .map((item, i) => [freqOf(item), i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, limit)
      .map(([, i]) => items[i]);
  }

  function readWord(id) {
    return $(id).value.trim();
  }

  function setStatus(text, isError = false) {
    const el = $("status");
    el.textContent = text;
    el.className = "status" + (isError ? " error" : "");
  }

  function renderChain(start, end, paths, limit) {
    const box = $("results");
    box.innerHTML = "";
    const top = topByFreq(
      paths,
      (path) => (path.length ? Math.min(...path.map(zipfChar)) : Infinity),
      limit,
    );
    for (const path of top) {
      const middles = [];
      for (let i = 0; i < path.length - 1; i++) middles.push(path[i] + path[i + 1]);
      const chain = [start, ...middles, end];
      const card = document.createElement("article");
      card.className = "card";
      const pathEl = document.createElement("div");
      pathEl.className = "path";
      pathEl.textContent = chain.join(" → ");
      const expl = document.createElement("div");
      expl.className = "expl";
      for (const word of middles) {
        expl.appendChild(explainLine(word));
      }
      card.appendChild(pathEl);
      if (middles.length) card.appendChild(expl);
      box.appendChild(card);
    }
  }

  function renderLadder(start, end, paths, limit) {
    const box = $("results");
    box.innerHTML = "";
    const ranked = topByFreq(
      paths,
      ([pos, charPath]) => {
        const chain = recoverWords(charPath, start, end, pos);
        const rest = chain.slice(1);
        if (!rest.length) return Infinity;
        return Math.min(...rest.map(zipfWord));
      },
      limit,
    );

    for (const [firstEditPos, charPath] of ranked) {
      const chain = recoverWords(charPath, start, end, firstEditPos);
      const card = document.createElement("article");
      card.className = "card card-ladder";
      const ladder = document.createElement("div");
      ladder.className = "ladder";

      let hold = firstEditPos;
      for (let i = 0; i < chain.length; i++) {
        const step = document.createElement("div");
        step.className = "ladder-step";

        const wordEl = document.createElement("div");
        wordEl.className = "ladder-word";
        for (const ch of chain[i]) {
          const span = document.createElement("span");
          span.textContent = ch;
          wordEl.appendChild(span);
        }
        if (i < chain.length - 1) {
          const changed = hold === 0 ? 1 : 0;
          const link = document.createElement("span");
          link.className = "ladder-link col-" + changed;
          link.setAttribute("aria-hidden", "true");
          wordEl.appendChild(link);
          hold = 1 - hold;
        }

        const explEl = document.createElement("div");
        explEl.className = "ladder-expl";
        if (i > 0 && i < chain.length - 1) explEl.textContent = explain(chain[i]);
        step.append(wordEl, explEl);
        ladder.appendChild(step);
      }

      card.appendChild(ladder);
      box.appendChild(card);
    }
  }

  function solve() {
    if (!state.ready) {
      setStatus("词库还没加载完成。", true);
      return;
    }
    const start = readWord("start");
    const end = readWord("end");
    if (start.length !== 2 || end.length !== 2) {
      setStatus("请输入两个字的词语。", true);
      return;
    }

    const limit = Math.max(1, Math.min(20, Number($("topn").value) || 5));
    $("go").disabled = true;
    setStatus("求解中…");
    $("results").innerHTML = "";

    requestAnimationFrame(() => {
      try {
        if (state.mode === "chain") {
          const paths = twoWaySearch(start, end);
          if (!paths.length) {
            setStatus(`无解：${start} → ${end}`, true);
          } else {
            const n = Math.min(limit, paths.length);
            setStatus(`最短路径共 ${paths.length} 条，以下为词频最高的前 ${n} 条。`);
            renderChain(start, end, paths, n);
          }
        } else {
          const paths = ladderSearch(start, end);
          if (!paths.length) {
            setStatus(`无解：${start} → ${end}`, true);
          } else {
            const n = Math.min(limit, paths.length);
            setStatus(`最短路径共 ${paths.length} 条，以下为词频最高的前 ${n} 条。`);
            renderLadder(start, end, paths, n);
          }
        }
      } catch (err) {
        setStatus("求解出错：" + err.message, true);
      } finally {
        $("go").disabled = false;
      }
    });
  }

  function setMode(mode) {
    state.mode = mode;
    $("tab-chain").classList.toggle("active", mode === "chain");
    $("tab-ladder").classList.toggle("active", mode === "ladder");
    $("title").textContent = mode === "chain" ? "接龙" : "词变";
  }

  const DB_NAME = "word-solvers";
  const STORE = "cache";

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cachedData() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).get("data");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async function saveData(data) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(data, "data");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function hideBoot() {
    $("boot").classList.add("hidden");
  }

  function showPicker(message) {
    $("boot-msg").textContent = message;
    $("picker").hidden = false;
  }

  async function startFrom(data) {
    $("boot-msg").textContent = "正在建立词语图…";
    ingest(data);
    hideBoot();
    setStatus("输入两个二字词后点「求解」。");
  }

  async function load() {
    const cached = await cachedData();
    if (cached && cached.w) {
      await startFrom(cached);
      return;
    }
    try {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error("fetch failed");
      $("boot-msg").textContent = "正在读取词库…";
      const data = await res.json();
      await saveData(data).catch(() => {});
      await startFrom(data);
    } catch {
      showPicker("请选择同目录下的 data.json（约十几 MB）。第一次选完后会缓存在本机。");
    }
  }

  $("tab-chain").addEventListener("click", () => {
    if ($("start").value === "顶流" && $("end").value === "修改") {
      $("start").value = "核算";
      $("end").value = "总结";
    }
    setMode("chain");
  });
  $("tab-ladder").addEventListener("click", () => {
    if ($("start").value === "核算" && $("end").value === "总结") {
      $("start").value = "顶流";
      $("end").value = "修改";
    }
    setMode("ladder");
  });
  $("swap").addEventListener("click", () => {
    const a = $("start").value;
    $("start").value = $("end").value;
    $("end").value = a;
  });
  $("go").addEventListener("click", solve);
  $("start").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") $("end").focus();
  });
  $("end").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") solve();
  });
  $("file").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    $("boot-msg").textContent = "正在读取词库…";
    $("picker").hidden = true;
    try {
      const data = JSON.parse(await file.text());
      if (!data.w) throw new Error("词库格式不对");
      await saveData(data).catch(() => {});
      await startFrom(data);
    } catch (err) {
      showPicker("读取失败：" + err.message);
    }
  });

  setMode("chain");
  load();
})();
