
const tabButtons = document.querySelectorAll('.tab');
const allPanels = document.querySelectorAll('.panel');

function showTab(clickedTab) {
  for (let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove('active');
  }
  for (let i = 0; i < allPanels.length; i++) {
    allPanels[i].classList.remove('active');
  }

  clickedTab.classList.add('active');
  document.getElementById('panel-' + clickedTab.dataset.panel).classList.add('active');
}

for (let i = 0; i < tabButtons.length; i++) {
  tabButtons[i].addEventListener('click', function () {
    showTab(tabButtons[i]);
  });
}

function cleanText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeList(items) {
  let html = '';
  for (let i = 0; i < items.length; i++) {
    html += '<li>' + cleanText(items[i]) + '</li>';
  }
  return html;
}

function buildResult(data) {
  const labels = {
    safe: 'Looks Safe',
    caution: 'Be a Little Careful',
    danger: 'This Looks Like a Scam'
  };
  const icons = { safe: '✓', caution: '!', danger: '!' };

  let verdict = data.verdict;
  if (!labels[verdict]) {
    verdict = 'caution';
  }

  let score = Number(data.score) || 0;
  if (score < 0) score = 0;
  if (score > 10) score = 10;

  let summary = '';
  if (data.summary) {
    summary = '<p class="summary">' + cleanText(data.summary) + '</p>';
  }

  return (
    '<div class="result-card ' + verdict + '">' +
      '<div class="score">' + score + '<small>out of 10 risk</small></div>' +
      '<div class="pill">' + icons[verdict] + ' ' + labels[verdict] + '</div>' +
      summary +
    '</div>' +
    '<h3>Here\'s what I noticed</h3>' +
    '<ul>' + makeList(data.reasons || []) + '</ul>' +
    '<h3>What I\'d do next</h3>' +
    '<ul>' + makeList(data.advice || []) + '</ul>' +
    '<p class="note">I\'m a helpful second opinion, not a guarantee. If something still feels off, ask someone you trust.</p>'
  );
}

async function runCheck(button) {
  const input = document.getElementById(button.dataset.input);
  const box = document.getElementById(button.dataset.results);
  const form = new FormData();
  form.append('type', button.dataset.check);

  if (input.type === 'file') {
    if (!input.files[0]) {
      box.className = 'results show';
      box.textContent = "Please choose a file first, and I'll take a look.";
      return;
    }
    form.append('file', input.files[0]);
  } else {
    const value = input.value.trim();
    if (value === '') {
      box.className = 'results show';
      box.textContent = 'Please add something for me to check first.';
      return;
    }
    form.append('text', value);
  }

  box.className = 'results show';
  box.textContent = 'Taking a careful look...';

  try {
    const response = await fetch(API + '/analyze', { method: 'POST', body: form });
    const data = await response.json();

    if (data.error) {
      box.textContent = 'Oops, something went wrong on my end. Please try again.';
      return;
    }
    box.innerHTML = buildResult(data);
  } catch (error) {
    box.textContent = "I couldn't connect. Please make sure the server is running.";
  }
}

const checkButtons = document.querySelectorAll('.btn');
for (let i = 0; i < checkButtons.length; i++) {
  checkButtons[i].addEventListener('click', function () {
    runCheck(checkButtons[i]);
  });
}

function setUpDropzone(zone) {
  const input = zone.querySelector('input');
  const nameBox = zone.querySelector('.drop-file');
  const preview = zone.querySelector('.drop-preview');

  input.addEventListener('change', function () {
    const file = input.files[0];

    if (file) {
      nameBox.textContent = '✓ ' + file.name;
    } else {
      nameBox.textContent = '';
    }

    if (preview) {
      if (file && file.type.startsWith('image/')) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    }
  });

  zone.addEventListener('dragover', function (e) {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', function () {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    zone.classList.remove('dragover');

    if (e.dataTransfer.files.length > 0) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

const dropzones = document.querySelectorAll('.dropzone');
for (let i = 0; i < dropzones.length; i++) {
  setUpDropzone(dropzones[i]);
}

async function loadNews() {
  const box = document.getElementById('newsFeed');
  if (!box) return;

  try {
    const response = await fetch(NEWS_API + '/news');
    const data = await response.json();

    if (data.error) {
      box.textContent = "I couldn't load the latest news right now.";
      return;
    }

    let storiesHtml = '';
    const stories = data.stories || [];
    for (let i = 0; i < stories.length; i++) {
      storiesHtml +=
        '<div class="story">' +
          '<h4>' + cleanText(stories[i].headline) + '</h4>' +
          '<p>' + cleanText(stories[i].summary) + '</p>' +
        '</div>';
    }

    let sourcesHtml = '';
    const sources = data.sources || [];
    for (let i = 0; i < sources.length; i++) {
      const url = sources[i].url;
      if (url && url.startsWith('https://')) {
        sourcesHtml +=
          '<li><a href="' + url.replace(/"/g, '%22') + '" target="_blank" rel="noopener">' +
          cleanText(sources[i].title || 'Source') + '</a></li>';
      }
    }

    let html =
      '<p class="news-note">Updated ' + cleanText(data.updated || '') +
      '. Written by AI from recent news, so check the sources.</p>' + storiesHtml;

    if (sourcesHtml) {
      html += '<h4>Sources</h4><ul class="news-sources">' + sourcesHtml + '</ul>';
    }

    box.innerHTML = html;
  } catch (error) {
    box.textContent = "I couldn't connect to load the news. Make sure the server is running.";
  }
}

loadNews();
