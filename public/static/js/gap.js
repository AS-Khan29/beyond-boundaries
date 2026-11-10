/* 05 — Opportunity gap analytics */
(function () {
  const gapColor = d3.interpolateRgbBasis(["#3D7BFF", "#8B5CF6", "#D9A75B", "#E8836B"]);

  function scatter(ds) {
    const svg = d3.select("#scatterSvg"), W = 640, H = 440, m = { t: 20, r: 24, b: 44, l: 48 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const x = d3.scaleLinear().domain([0, 100]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(ds, d => d.conversion) * 1.15]).nice().range([H - m.b, m.t]);
    const r = d3.scaleSqrt().domain([0, d3.max(ds, d => d.learners)]).range([3, 30]);
    svg.append("g").attr("class", "ax").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.t - m.b)))
      .call(g => g.select(".domain").remove()).call(g => g.selectAll("line").attr("stroke-dasharray", "2 4"));
    svg.append("g").attr("class", "ax").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%").tickSize(-(W - m.l - m.r)))
      .call(g => g.select(".domain").remove()).call(g => g.selectAll("line").attr("stroke-dasharray", "2 4"));
    svg.append("text").attr("class", "quad").attr("x", W - m.r - 6).attr("y", m.t + 16).attr("text-anchor", "end").text("connected & converting");
    svg.append("text").attr("class", "quad").attr("x", m.l + 8).attr("y", H - m.b - 10).text("the widest gap");
    svg.append("text").attr("class", "ax").attr("x", W - m.r).attr("y", H - 8).attr("text-anchor", "end").append("tspan").attr("style", "font:400 10px PlexMono;fill:#8E97BE").text("CONNECTIVITY INDEX →");
    svg.append("text").attr("x", m.l).attr("y", 12).attr("style", "font:400 10px PlexMono;fill:#8E97BE").text("↑ TRAINED GIRLS EARNING ONLINE");
    const g = svg.append("g");
    g.selectAll("circle").data([...ds].sort((a, b) => b.learners - a.learners)).join("circle")
      .attr("class", "bub").attr("cx", d => x(d.connectivity)).attr("cy", H - m.b).attr("r", d => r(d.learners))
      .attr("fill", d => gapColor(d.gap / 100)).attr("fill-opacity", .78)
      .on("click", (e, d) => BB.emit("select-district", d.id))
      .call(s => s.append("title").text(d => `${d.name}: connectivity ${d.connectivity}, ${d.conversion}% earning, gap ${d.gap} (sample)`))
      .transition().duration(1200).delay((d, i) => i * 25).attr("cy", d => y(d.conversion));
    g.selectAll("text").data(ds.filter(d => d.learners > 300 || d.gap > 80)).join("text").attr("class", "bl")
      .attr("x", d => x(d.connectivity) + r(d.learners) + 3).attr("y", d => y(d.conversion) + 3).text(d => d.name);
  }

  function ranks(ds) {
    const el = document.getElementById("rankBars");
    const s = [...ds].sort((a, b) => b.gap - a.gap);
    el.innerHTML = s.map(d => `<div class="rank" data-id="${d.id}" title="Show ${BB.esc(d.name)} on the map"><span>${BB.esc(d.name)}</span>
      <div class="t"><i data-w="${d.gap}" style="background:${gapColor(d.gap / 100)}"></i></div><b>${d.gap}</b></div>`).join("");
    el.addEventListener("click", e => { const r = e.target.closest(".rank"); if (r) BB.emit("select-district", r.dataset.id); });
  }

  function provenance(a) {
    const p = a.provenance, t = a.totals;
    document.getElementById("provenance").innerHTML = `
      <div><h4>Data status</h4><p class="big">${p.verified_districts}<span style="font-size:1rem;color:var(--muted)"> / ${p.verified_districts + p.sample_districts}</span></p>
        <p>districts with verified figures. All others show <span class="tag sample">sample</span> data until real numbers are loaded.</p></div>
      <div><h4>Province totals <span class="tag sample">sample</span></h4><p class="big">${BB.fmt(t.earning)}</p>
        <p>of ${BB.fmt(t.learners)} girls in training earn online — supported by ${BB.fmt(t.mentors)} mentors and ${t.hubs} hubs.</p></div>
      <div><h4>Live at this event</h4><p class="big">${BB.fmt(a.live.simulations + a.live.wall_entries)}</p>
        <p>${BB.fmt(a.live.simulations)} career simulations and ${BB.fmt(a.live.wall_entries)} new aspirations recorded on this platform.</p></div>
      <div><h4>How to read the index</h4><p>Gap = 100 − (½ × connectivity + ½ × conversion, with 25% conversion counting as full). Verified rows replace samples automatically.</p></div>`;
  }

  async function init() {
    const a = await BB.api("/api/analytics");
    let drawn = false;
    const io = new IntersectionObserver(es => {
      if (drawn || !es.some(e => e.isIntersecting)) return;
      drawn = true; io.disconnect();
      scatter(a.districts); ranks(a.districts); provenance(a);
      requestAnimationFrame(() => document.querySelectorAll("#rankBars i").forEach((i, k) => setTimeout(() => i.style.width = i.dataset.w + "%", k * 30)));
    }, { threshold: .15 });
    io.observe(document.getElementById("gap"));
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
