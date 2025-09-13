export function initNavBar() {
  const nav = document.createElement('nav');
  nav.id = 'nav-bar';
  nav.innerHTML = `
    <ul class="nav-menu">
      <li><a href="/">Home</a></li>
    </ul>
  `;
  document.body.prepend(nav);
  console.log('Navigation bar initialized');
}

if (typeof window !== 'undefined') {
  window.initNavBar = initNavBar;
}
