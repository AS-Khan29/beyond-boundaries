/* 03 — From skills to earnings: a complete sample journey */
(function () {
  Chart.defaults.color = "#8E97BE";
  Chart.defaults.font.family = "PlexMono, ui-monospace, monospace";
  Chart.defaults.font.size = 11;
  Chart.defaults.borderColor = "rgba(233,223,207,.08)";

  async function init() {
    const { journey: J, persona: P } = await BB.api("/api/journey");
    document.getElementById("journeyLede").textContent =
      `${P.name}, ${P.age}, from ${P.district[0].toUpperCase() + P.district.slice(1)} — ${P.education}. One complete journey, month by month, from her first lesson to a verified international client.`;
    const track = document.getElementById("journeyTrack");
    track.innerHTML = `<div class="prog"></div>` + J.stages.map((s, i) => `
      <div class="stg" data-i="${i}"><div class="dot">${i === J.stages.length - 1 ? "✓" : "0" + (i + 1)}</div>
        <div class="m">Month ${s.months}</div><h3>${s.label}</h3><p>${BB.esc(s.detail)}</p><div class="ev">${BB.esc(s.evidence)}</div></div>`).join("");

    const sum = a => a.reduce((x, y) => x + y, 0);
    const figs = [
      ["Learning hours", J.learning_hours.at(-1)], ["Portfolio pieces", J.portfolio.at(-1)],
      ["Proposals sent", sum(J.proposals)], ["Orders completed", sum(J.orders)],
    ];
    const totalPkr = sum(J.earnings_pkr);
    document.getElementById("journeyFigs").innerHTML = figs.map(([k, v]) => `<div><dt>${k}</dt><dd data-to="${v}">0</dd></div>`).join("") +
      `<div style="grid-column:span 2"><dt>Earned in six months (PKR)</dt><dd data-to="${totalPkr}" style="color:var(--brass)">0</dd></div>
       <div class="verified-stamp"><svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="16" fill="none" stroke="#7CE0B5"/><path d="M10 17.5l4.5 4.5L24 12.5" fill="none" stroke="#7CE0B5" stroke-width="2"/></svg>
       <span><b style="color:var(--sand);font-weight:500">Verified outcome.</b> In the full platform, earnings and client feedback are checked by the programme team before a journey counts as a success.</span></div>`;

    let chart;
    const build = () => {
      const ctx = document.getElementById("journeyChart");
      const grad = ctx.getContext("2d").createLinearGradient(0, 0, 0, 330);
      grad.addColorStop(0, "rgba(217,167,91,.35)"); grad.addColorStop(1, "rgba(217,167,91,0)");
      chart = new Chart(ctx, {
        data: {
          labels: J.months.map(m => "Month " + m),
          datasets: [
            { type: "line", label: "Monthly earnings (PKR)", data: J.earnings_pkr, yAxisID: "y1", borderColor: "#D9A75B", backgroundColor: grad, fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: "#D9A75B", borderWidth: 2 },
            { type: "bar", label: "Proposals sent", data: J.proposals, yAxisID: "y", backgroundColor: "rgba(90,169,255,.55)", borderRadius: 4, barPercentage: .5 },
            { type: "bar", label: "Portfolio pieces", data: J.portfolio, yAxisID: "y", backgroundColor: "rgba(139,92,246,.7)", borderRadius: 4, barPercentage: .5 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 1600, easing: "easeOutQuart" },
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "top", align: "start", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 18 } },
            tooltip: { backgroundColor: "#0A1030", borderColor: "rgba(233,223,207,.2)", borderWidth: 1, padding: 12,
              callbacks: { label: c => ` ${c.dataset.label}: ${c.dataset.yAxisID === "y1" ? "PKR " + BB.fmt(c.raw) : c.raw}` } } },
          scales: {
            x: { grid: { display: false } },
            y: { position: "left", beginAtZero: true, title: { display: true, text: "count" }, grid: { color: "rgba(233,223,207,.06)" } },
            y1: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { callback: v => (v / 1000) + "k" }, title: { display: true, text: "PKR" } },
          },
        },
      });
    };

    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const stg = [...track.querySelectorAll(".stg")];
      stg.forEach((s, i) => setTimeout(() => s.classList.add("lit"), 250 + i * 320));
      track.querySelector(".prog").style.width = "100%";
      document.querySelectorAll("#journeyFigs dd[data-to]").forEach(d => BB.countUp(d, +d.dataset.to, 1800));
      build();
    }), { threshold: .25 });
    io.observe(document.getElementById("journey"));
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
