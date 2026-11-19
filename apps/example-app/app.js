// Pure offline JS — no external dependencies
document.getElementById('btn').addEventListener('click', () => {
  const out = document.getElementById('output');
  out.textContent = 'Clicked at ' + new Date().toLocaleTimeString();
});
