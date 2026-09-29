const $ = (id) => document.getElementById(id);
const KEY = 'link-the-word-content';
let data = { levels: [], daily: {} };
let github = { token: '', sha: {} };
const repo = 'ButterJack07/link';

function normalize(value) { return value.trim().toUpperCase().replace(/[^A-Z]/g, ''); }
function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
function normalizeLevel(level) { return { id: String(level.id).padStart(6, '0'), clue: level.clue || '', answers: Array.isArray(level.answers) ? level.answers : [] }; }
function download(name, content) { const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function setStatus(text, error = false) { $('publishStatus').textContent = text; $('publishStatus').classList.toggle('error', error); }
async function githubRequest(path, options = {}) { const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=master`, { ...options, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${github.token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } }); if (!response.ok) { let detail = ''; try { detail = (await response.json()).message || ''; } catch {} throw new Error(`${response.status}${detail ? `: ${detail}` : ''}`); } return response.json(); }
function decodeGithubContent(value) { const binary = atob(value.replace(/\n/g, '')); const bytes = Uint8Array.from(binary, char => char.charCodeAt(0)); return new TextDecoder().decode(bytes); }
async function connectGithub() { const token = $('githubToken').value.trim(); if (!token) return setStatus('请先粘贴 GitHub Token。', true); github.token = token; setStatus('正在读取 GitHub 数据…'); try { const [levelsFile, dailyFile] = await Promise.all([githubRequest('levels.json'), githubRequest('daily.json')]); data.levels = JSON.parse(decodeGithubContent(levelsFile.content)); data.daily = JSON.parse(decodeGithubContent(dailyFile.content)); github.sha = { 'levels.json': levelsFile.sha, 'daily.json': dailyFile.sha }; render(); setStatus('已连接，可以直接发布。'); } catch (error) { github.token = ''; setStatus(`连接失败：${error.message}`, true); } }
async function publishFile(path, content, message) { const current = await githubRequest(path); const bytes = new TextEncoder().encode(JSON.stringify(content, null, 2) + '\n'); let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); const result = await githubRequest(path, { method: 'PUT', body: JSON.stringify({ message, content: btoa(binary), sha: current.sha, branch: 'master' }) }); github.sha[path] = result.content.sha; }
async function publishGithub() { if (!github.token) return setStatus('请先连接 GitHub。', true); setStatus('正在提交 levels.json…'); try { await publishFile('levels.json', data.levels, 'Update level library'); setStatus('levels.json 已提交，正在提交 daily.json…'); await publishFile('daily.json', data.daily, 'Update daily challenges'); setStatus('发布成功，已写入 GitHub master 分支。'); } catch (error) { setStatus(`发布失败：${error.message}`, true); } }
function render() {
  const usedDailyIds = new Set(Object.values(data.daily).map(id => String(id).padStart(6, '0')));
  const availableLevels = data.levels.filter(level => !usedDailyIds.has(String(level.id).padStart(6, '0')));
  $('dailyLevel').innerHTML = availableLevels.length ? availableLevels.map(level => `<option value="${level.id}">${level.id}</option>`).join('') : '<option value="">没有未安排的题目</option>';
  $('levelList').innerHTML = data.levels.map(level => `<article><b>${level.id}</b><span>${level.clue}</span><em>${level.answers.join(' / ')}</em></article>`).join('') || '<p>还没有题目。</p>';
  renderRecentDaily();
}
function dateKey(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function renderRecentDaily() {
  const rows = [];
  const levelMap = new Map(data.levels.map(level => [String(level.id).padStart(6, '0'), level]));
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let offset = -7; offset < 13; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const key = dateKey(date);
    const id = data.daily[key] ? String(data.daily[key]).padStart(6, '0') : '';
    const level = levelMap.get(id);
    rows.push(`<div class="daily-row"><time>${key}</time>${id ? `<span>${id}</span><b>${level?.clue || '题目未找到'}</b>` : '<em>未安排</em>'}</div>`);
  }
  $('recentDaily').innerHTML = rows.join('');
}
async function init() {
  try {
    const [levels, daily] = await Promise.all([fetch(`levels.json?t=${Date.now()}`).then(response => response.json()), fetch(`daily.json?t=${Date.now()}`).then(response => response.json())]);
    data = { levels: levels.map(normalizeLevel), daily };
    save();
  } catch {
    const cached = localStorage.getItem(KEY);
    if (cached) data = JSON.parse(cached);
  }
  render();
}
$('levelForm').addEventListener('submit', event => { event.preventDefault(); const answers = [...document.querySelectorAll('.answer')].map(input => normalize(input.value)); if (new Set(answers).size !== 3 || answers.some(word => !word)) return alert('请填写三个不同的英文答案。'); const next = data.levels.reduce((max, level) => Math.max(max, Number(level.id) || 0), 0) + 1; const id = String(next).padStart(6, '0'); data.levels.push({ id, clue: $('clue').value.trim(), answers }); save(); render(); event.currentTarget.reset(); });
$('dailyForm').addEventListener('submit', event => { event.preventDefault(); const id = $('dailyLevel').value; if (!id) return alert('没有可安排的题目。'); if (Object.values(data.daily).map(value => String(value).padStart(6, '0')).includes(id)) return alert('这道题已经安排过每日挑战。'); data.daily[$('dailyDate').value] = id; save(); render(); alert('已加入每日挑战表。'); });
$('downloadLevels').addEventListener('click', () => download('levels.json', data.levels));
$('downloadDaily').addEventListener('click', () => download('daily.json', data.daily));
$('connectGithub').addEventListener('click', connectGithub);
$('publishGithub').addEventListener('click', publishGithub);
init();
