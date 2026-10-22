// Shows which site was blocked (from ?site=...). textContent, so nothing in the address can run.
const site = new URLSearchParams(location.search).get('site');
if (site) document.getElementById('site').textContent = site;
