'use strict';
const search = document.getElementById('search');
const filters = [...document.querySelectorAll('.filters button')];
const rows = [...document.querySelectorAll('.grade-row')];
const empty = document.getElementById('empty');
const status = document.getElementById('status');
let selected = 'all';

function normalize(value) {
  return value.toLowerCase().trim().replace(/,/g, '.').replace(/\s+/g, ' ');
}

function render(updateURL = true) {
  const query = normalize(search.value);
  let count = 0;
  for (const row of rows) {
    let visible = 0;
    for (const link of row.querySelectorAll('.group-link')) {
      const text = `${link.dataset.label} ${row.dataset.grade} класс английский язык${row.dataset.grade === '11' ? ' егэ' : ''}`;
      const matches = (selected === 'all' || selected === row.dataset.grade) && text.includes(query);
      link.hidden = !matches;
      if (matches) visible++;
    }
    row.hidden = visible === 0;
    count += visible;
  }
  empty.hidden = count !== 0;
  status.textContent = count ? `Найдено групп: ${count}` : 'Группы не найдены. Измените запрос или сбросьте фильтры.';
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.grade === selected));
  if (updateURL) {
    const url = new URL(location.href);
    url.searchParams.delete('class');
    url.searchParams.delete('q');
    if (selected !== 'all') url.searchParams.set('class', selected);
    if (search.value.trim()) url.searchParams.set('q', search.value.trim());
    history.replaceState(null, '', url);
  }
}

function restore() {
  const params = new URLSearchParams(location.search);
  selected = filters.some(button => button.dataset.grade === params.get('class')) ? params.get('class') : 'all';
  search.value = params.get('q') || '';
  render(false);
}

filters.forEach(button => button.addEventListener('click', () => {
  selected = button.dataset.grade;
  render();
}));
search.addEventListener('input', () => render());
document.getElementById('reset').addEventListener('click', () => {
  selected = 'all';
  search.value = '';
  render();
  search.focus();
});
window.addEventListener('popstate', restore);
restore();
