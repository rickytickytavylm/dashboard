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

  function kiraSales() {
    const J = (window.DATA && window.DATA.journey) || null;
    const base = (window.DATA && window.DATA.amo_october) || null;
    if (!J || !J.sales) return { base };
    return { base, sales: J.sales, live: J.live };
  }

  function paint() {
    const w = state.web && state.web.kpis;
    const t = state.tg;
    const pack = kiraSales();
    const snap = pack.live || {};
    const sales = pack.sales || {};
    const base = pack.base;
    const liveNow = (w ? w.live || 0 : 0) + (t ? t.live || 0 : 0);
    const phonesNow = (w ? w.phones || 0 : 0) + (t ? t.phones || 0 : 0);
    const octLive = snap.total || 0;
    $("home-kpis").innerHTML = [
      ["Живые октября", fi(octLive), "ТГ " + fi(snap.tg && snap.tg.live) + " · сайт " + fi(snap.web && snap.web.live)],
      ["Сегодня онлайн", (state.err.tg && state.err.web) ? "нет связи" : fi(liveNow), "ТГ " + (t ? fi(t.live) : "…") + " · сайт " + (w ? fi(w.live) : "…")],
      ["Продажи Киры", fi(sales.n), fm(sales.sum) + " · из " + (base ? fi(base.won) : "—") + " успехов amo"],
      ["Вся база amo", base ? fi(base.all) : "—", base ? "успех " + fi(base.won) + " · слив " + fi(base.lost) + " · в работе " + fi(base.open) : ""],
    ].map((x) => '<div class="kpi"><div class="k-t">' + x[0] + '</div><div class="k-v">' + x[1] + '</div><div class="k-s">' + x[2] + "</div></div>").join("");

    const octTg = (snap.tg_families || []).map((r) => ({ name: r.name, live: r.live, phones: r.phones }));
    const octWeb = (snap.web_families || []).map((r) => ({ name: r.name, live: r.live, phones: r.phones }));
    $("src-tg").innerHTML = t
      ? "<p class=\"cap\">сегодня " + fi(t.live) + " живых · " + fi(t.phones) + " номеров</p>" + bars(t.tails, (r) => r.live)
      : "<p class=\"cap\">октябрь " + fi(snap.tg && snap.tg.live) + " живых. Онлайн: " + (state.err.tg || "гружу") + "</p>" + bars(octTg, (r) => r.live);
    const webTails = ((state.web && state.web.tails) || []).map((r) => ({ tail: r.tail, live: r.live, phones: r.phones }));
    $("src-web").innerHTML = w
      ? "<p class=\"cap\">сегодня " + fi(w.live) + " живых · " + fi(w.phones) + " номеров</p>" + bars(webTails, (r) => r.live)
      : "<p class=\"cap\">октябрь " + fi(snap.web && snap.web.live) + " живых. Онлайн: " + (state.err.web || "гружу") + "</p>" + bars(octWeb, (r) => r.live);
    const types = (sales.types || []).map((r) => ({ name: r.name, live: r.n, phones: null, rub: r.sum }));
    if ($("src-amo-cap")) $("src-amo-cap").textContent = sales.n
      ? fi(sales.n) + " сделок · " + fm(sales.sum) + ". Это не все " + (base ? fi(base.all) : "") + " карточек amo и не все " + (base ? fi(base.won) : "") + " успехи."
      : "";
    $("src-amo").innerHTML = types.length
      ? bars(types, (r) => r.live)
      : "<p class=\"cap\">нет проверенных продаж Киры</p>";
    const tgShow = (t && t.tails && t.tails.length) ? t.tails : octTg;
    const webShow = webTails.length ? webTails : octWeb;
    $("home-tails").innerHTML = "<div class=\"grid g-2b\"><div><h3 style=\"margin:0 0 8px\">" + (t ? "Telegram сегодня" : "Telegram октябрь") + "</h3>"
      + bars(tgShow, (r) => r.live) + "</div><div><h3 style=\"margin:0 0 8px\">" + (w ? "Сайт сегодня" : "Сайт октябрь") + "</h3>"
      + bars(webShow, (r) => r.live) + "</div></div>";
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
