// 1. Make the tabs clickable
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

// 2. Make the orange button clickable
document.getElementById('linkBtn').addEventListener('click', function () {
  const text = document.getElementById('linkInput').value;
  document.getElementById('linkResults').textContent = 'You typed: ' + text;
});