const $ = (id) => document.getElementById(id);
const KEY = 'link-the-word-content';
let data = { levels: [], daily: {} };
let github = { token: '', sha: {} };
const repo = 'ButterJack07/link';

function normalize(value) { return value.trim().toUpperCase().replace(/[^A-Z]/g, ''); }
function duplicateLetters(word) { return /(.)\1/.test(word); }
function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
function download(name, content) { const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function setStatus(text, error = false) { $('publishStatus').textContent = text; $('publishStatus').classList.toggle('error', error); }
async function githubRequest(path, options = {}) { const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { ...options, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${github.token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } }); if (!response.ok) throw new Error(`${response.status}`); return response.json(); }
async function connectGithub() { const token = $('githubToken').value.trim(); if (!token) return setStatus('请先粘贴 GitHub Token。', true); github.token = token; setStatus('正在读取 GitHub 数据…'); try { const [levelsFile, dailyFile] = await Promise.all([githubRequest('levels.json'), githubRequest('daily.json')]); data.levels = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(levelsFile.content.replace(/\n/g, '')), char => char.charCodeAt(0)))); data.daily = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(dailyFile.content.replace(/\n/g, '')), char => char.charCodeAt(0)))); github.sha = { 'levels.json': levelsFile.sha, 'daily.json': dailyFile.sha }; render(); setStatus('已连接，可以直接发布。'); } catch { github.token = ''; setStatus('连接失败，请检查 Token 和仓库 Contents 权限。', true); } }
async function publishFile(path, content, message) { const bytes = new TextEncoder().encode(JSON.stringify(content, null, 2) + '\n'); let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); const result = await githubRequest(path, { method: 'PUT', body: JSON.stringify({ message, content: btoa(binary), sha: github.sha[path], branch: 'master' }) }); github.sha[path] = result.content.sha; }
async function publishGithub() { if (!github.token) return setStatus('请先连接 GitHub。', true); setStatus('正在提交数据…'); try { await publishFile('levels.json', data.levels, 'Update level library'); await publishFile('daily.json', data.daily, 'Update daily challenges'); setStatus('发布成功，游戏会自动读取最新题库。'); } catch { setStatus('发布失败，请确认 Token 有 Contents: Read and write 权限。', true); } }
function render() {
  $('dailyLevel').innerHTML = data.levels.map(level => `<option value="${level.id}">${level.id} - ${level.title}</option>`).join('');
  $('levelList').innerHTML = data.levels.map(level => `<article><b>${level.id}</b><span>${level.clue}</span><em>${level.answers.join(' / ')}</em></article>`).join('') || '<p>还没有题目。</p>';
}
async function init() {
  const cached = localStorage.getItem(KEY);
  if (cached) { data = JSON.parse(cached); render(); return; }
  const [levels, daily] = await Promise.all([fetch('levels.json').then(response => response.json()), fetch('daily.json').then(response => response.json())]);
  data = { levels, daily }; render();
}
$('levelForm').addEventListener('submit', event => { event.preventDefault(); const answers = [...document.querySelectorAll('.answer')].map(input => normalize(input.value)); if (new Set(answers).size !== 3 || answers.some(word => !word || duplicateLetters(word))) return alert('填写三个不同的英文答案，且不能有连续重复字母。'); const next = data.levels.reduce((max, level) => Math.max(max, Number(level.id) || 0), 0) + 1; const id = String(next).padStart(6, '0'); data.levels.push({ id, clue: $('clue').value.trim(), answers }); save(); render(); event.currentTarget.reset(); });
$('dailyForm').addEventListener('submit', event => { event.preventDefault(); data.daily[$('dailyDate').value] = $('dailyLevel').value; save(); alert('已加入每日挑战表。'); });
$('downloadLevels').addEventListener('click', () => download('levels.json', data.levels));
$('downloadDaily').addEventListener('click', () => download('daily.json', data.daily));
$('connectGithub').addEventListener('click', connectGithub);
$('publishGithub').addEventListener('click', publishGithub);
init();
