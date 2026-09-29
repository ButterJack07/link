const $ = (id) => document.getElementById(id);
const KEY = 'link-the-word-content';
let data = { levels: [], daily: {} };

function normalize(value) { return value.trim().toUpperCase().replace(/[^A-Z]/g, ''); }
function duplicateLetters(word) { return /(.)\1/.test(word); }
function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
function download(name, content) { const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function render() {
  $('dailyLevel').innerHTML = data.levels.map(level => `<option value="${level.id}">${level.id} - ${level.title}</option>`).join('');
  $('levelList').innerHTML = data.levels.map(level => `<article><b>${level.id}</b><span>${level.title}</span><small>${level.clue}</small><em>${level.answers.join(' / ')}</em></article>`).join('') || '<p>还没有题目。</p>';
}
async function init() {
  const cached = localStorage.getItem(KEY);
  if (cached) { data = JSON.parse(cached); render(); return; }
  const [levels, daily] = await Promise.all([fetch('levels.json').then(response => response.json()), fetch('daily.json').then(response => response.json())]);
  data = { levels, daily }; render();
}
$('levelForm').addEventListener('submit', event => { event.preventDefault(); const answers = [...document.querySelectorAll('.answer')].map(input => normalize(input.value)); if (new Set(answers).size !== 3 || answers.some(word => !word || duplicateLetters(word))) return alert('填写三个不同的英文答案，且不能有连续重复字母。'); const id = String(data.levels.length + 1).padStart(6, '0'); data.levels.push({ id, title: $('title').value.trim(), clue: $('clue').value.trim(), answers }); save(); render(); event.currentTarget.reset(); });
$('dailyForm').addEventListener('submit', event => { event.preventDefault(); data.daily[$('dailyDate').value] = $('dailyLevel').value; save(); alert('已加入每日挑战表。'); });
$('downloadLevels').addEventListener('click', () => download('levels.json', data.levels));
$('downloadDaily').addEventListener('click', () => download('daily.json', data.daily));
init();
