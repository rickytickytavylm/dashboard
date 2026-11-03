/* Живая главная: Telegram + сайт + amo. Обновление раз в 60 секунд. */
(function () {
  const KEY = "shurov2026";
  const WEB = "https://api.kira-ai.online";
  const TG = "https://rickytickytavylm-shurov-ai-ea39.twc1.net";
  const fi = (n) => (Number(n) || 0).toLocaleString("ru-RU");
  const fm = (n) => fi(Math.round(Number(n) || 0)) + " ₽";
  const $ = (id) => document.getElementById(id);

  const state = { web: null, tg: null, amo: null, err: {} };

  function pill(text, bad) {
    const el = $("livepill");
    if (!el) return;
    el.textContent = text;
    el.style.color = bad ? "#b42318" : "";
  }

  function bars(rows, value) {
    const list = (rows || []).filter((r) => value(r) > 0).slice(0, 12);
    const max = Math.max(1, ...list.map(value));
    if (!list.length) return '<p class="cap">Пока пусто</p>';
    return '<div class="blist">' + list.map((r) => {
      const v = value(r);
      const name = r.tail || r.name || "—";
      const extra = r.phones != null ? " · " + r.phones + " ном." : "";
      return '<div class="brow"><span class="nm" title="' + name + '">' + name + '</span>'
        + '<div class="track"><i style="width:' + Math.round(100 * v / max) + '%;background:#0071e3"></i></div>'
        + '<span class="vl">' + v + extra + '</span></div>';
    }).join("") + "</div>";
  }

  function amoSlice() {
    const D = window.DATA;
    if (!D || !D.leads) return null;
    let won = 0, wrev = 0, open = 0, orev = 0, lost = 0;
    const pipes = {};
    (D.leads || []).forEach((l) => {
      if (l.s === 1) { won++; wrev += l.pr || 0; }
      else if (l.s === 2) lost++;
      else { open++; orev += l.pr || 0; }
      const name = (D.pipelines || [])[l.p] || "—";
      const b = pipes[name] || (pipes[name] = { n: 0, won: 0, rev: 0 });
      b.n++;
      if (l.s === 1) { b.won++; b.rev += l.pr || 0; }
    });
    const tags = {};
    (D.leads || []).forEach((l) => {
      (l.t || []).forEach((i) => {
        const name = (D.tags || [])[i];
        if (!name) return;
        tags[name] = (tags[name] || 0) + 1;
      });
    });
    const tagRows = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([name, n]) => ({ name, live: n }));
    const pipeRows = Object.entries(pipes).sort((a, b) => b[1].rev - a[1].rev)
      .map(([name, b]) => ({ name, n: b.n, won: b.won, rev: b.rev }));
    return {
      n: D.leads.length, won, wrev, open, orev, lost, tagRows, pipeRows,
      from: D.period && D.period.from, to: D.period && D.period.to,
    };
  }

  function paint() {
    const w = state.web && state.web.kpis;
    const t = state.tg;
    const a = amoSlice();
    const live = (w ? w.live || 0 : 0) + (t ? t.live || 0 : 0);
    const phones = (w ? w.phones || 0 : 0) + (t ? t.phones || 0 : 0);
    $("home-kpis").innerHTML = [
      ["Живые сегодня", fi(live), "ТГ " + fi(t && t.live) + " · сайт " + fi(w && w.live)],
      ["Номера", fi(phones), live ? Math.round(1000 * phones / live) / 10 + "% живых" : "—"],
      ["Успех amo", a ? fi(a.won) : "—", a ? fm(a.wrev) : "нет среза"],
      ["В работе amo", a ? fi(a.open) : "—", a ? fm(a.orev) : ""],
    ].map((x) => '<div class="kpi"><div class="k-t">' + x[0] + '</div><div class="k-v">' + x[1] + '</div><div class="k-s">' + x[2] + "</div></div>").join("");

    $("src-tg").innerHTML = t
      ? "<p class=\"cap\">" + fi(t.live) + " живых · " + fi(t.phones) + " номеров · " + (t.phone_pct || 0) + "% · средний " + (t.avg || 0) + "</p>" + bars(t.tails, (r) => r.live)
      : "<p class=\"cap\">" + (state.err.tg || "гружу Telegram…") + "</p>";
    const webTails = ((state.web && state.web.tails) || []).map((r) => ({ tail: r.tail, live: r.live, phones: r.phones }));
    $("src-web").innerHTML = w
      ? "<p class=\"cap\">" + fi(w.live) + " живых · " + fi(w.phones) + " номеров · " + (w.phone_pct || 0) + "%</p>" + bars(webTails, (r) => r.live)
      : "<p class=\"cap\">" + (state.err.web || "гружу сайт…") + "</p>";
    $("src-amo").innerHTML = a
      ? "<p class=\"cap\">" + (a.from || "") + " — " + (a.to || "") + " · " + fi(a.n) + " сделок · успех " + fi(a.won) + " · " + fm(a.wrev) + "</p>"
        + bars(a.pipeRows.map((p) => ({ name: p.name, live: p.won })), (r) => r.live)
      : "<p class=\"cap\">amo не вшит</p>";
    $("home-tails").innerHTML = "<div class=\"grid g-2b\"><div><h3 style=\"margin:0 0 8px\">Хвосты Telegram</h3>"
      + bars(t && t.tails, (r) => r.live) + "</div><div><h3 style=\"margin:0 0 8px\">Хвосты сайта</h3>"
      + bars(webTails, (r) => r.live) + "</div></div>";
    $("home-amo-tags").innerHTML = a ? bars(a.tagRows, (r) => r.live) : "";
    const stamp = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const bad = state.err.tg || state.err.web;
    pill((bad ? "часть не обновилась · " : "онлайн · ") + stamp, !!bad);
  }

  async function pull() {
    const jobs = [
      fetch(WEB + "/admin/api/dashboard-stats?period=today&token=" + encodeURIComponent(KEY))
        .then((r) => { if (!r.ok) throw new Error("web " + r.status); return r.json(); })
        .then((j) => { state.web = j; state.err.web = ""; })
        .catch((e) => { state.err.web = "сайт: " + e.message; }),
      fetch(TG + "/admin/api/live-today?token=" + encodeURIComponent(KEY))
        .then((r) => { if (!r.ok) throw new Error("тг " + r.status); return r.json(); })
        .then((j) => { state.tg = j; state.err.tg = ""; })
        .catch((e) => { state.err.tg = "Telegram: " + e.message; }),
    ];
    await Promise.all(jobs);
    paint();
  }

  function boot() {
    if (!$("home-kpis")) return;
    paint();
    pull();
    setInterval(pull, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
