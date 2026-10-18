const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    tabs.forEach(function (t) { t.classList.remove('active'); });
    panels.forEach(function (p) { p.classList.remove('active'); });

    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
  });
});

function escapeHtml(s){
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildResult(data){
  const labels = {safe: "Looks Safe", caution: "Be a Little Careful", danger: "This Looks Like a Scam"};
  const icons = {safe: "✓", caution: "!", danger: "!"};
  const verdict = labels[data.verdict] ? data.verdict : "caution";
  const score = Math.max(0, Math.min(10, Number(data.score) || 0));

  const reasons = (data.reasons || []).map(r => "<li>" + escapeHtml(r) + "</li>").join("");
  const advice = (data.advice || []).map(a => "<li>" + escapeHtml(a) + "</li>").join("");
  const summary = data.summary ? "<p class='summary'>" + escapeHtml(data.summary) + "</p>" : "";

  return `
    <div class="result-card ${verdict}">
      <div class="score">${score}<small>out of 10 risk</small></div>
      <div class="pill">${icons[verdict]} ${labels[verdict]}</div>
      ${summary}
    </div>
    <h3>Here's what I noticed</h3>
    <ul>${reasons}</ul>
    <h3>What I'd do next</h3>
    <ul>${advice}</ul>
    <p class="note">I'm a helpful second opinion, not a guarantee. If something still feels off, ask someone you trust.</p>
  `;
}

document.querySelectorAll('.btn').forEach(function (btn) {
  btn.addEventListener('click', async function () {
    const input = document.getElementById(btn.dataset.input);
    const box = document.getElementById(btn.dataset.results);
    const form = new FormData();
    form.append('type', btn.dataset.check);

    if (input.type === 'file') {
      if (!input.files[0]) {
        box.className = 'results show';
        box.textContent = "Please choose a file first, and I'll take a look.";
        return;
      }
      form.append('file', input.files[0]);
    } else {
      const value = input.value.trim();
      if (!value) {
        box.className = 'results show';
        box.textContent = 'Please add something for me to check first.';
        return;
      }
      form.append('text', value);
    }

    box.className = 'results show';
    box.textContent = 'Taking a careful look...';

    try {
      const res = await fetch('http://localhost:5000/analyze', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) {
        box.textContent = 'Oops, something went wrong on my end. Please try again.';
        return;
      }
      box.innerHTML = buildResult(data);
    } catch (e) {
      box.textContent = "I couldn't connect. Please make sure the server is running.";
    }
  });
});
