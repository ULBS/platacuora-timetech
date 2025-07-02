
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "route": "/auth-callback"
  },
  {
    "renderMode": 2,
    "route": "/debug-auth"
  },
  {
    "renderMode": 2,
    "route": "/hours-list"
  },
  {
    "renderMode": 2,
    "route": "/calendar"
  },
  {
    "renderMode": 2,
    "route": "/profile"
  },
  {
    "renderMode": 2,
    "route": "/declarations"
  },
  {
    "renderMode": 2,
    "redirectTo": "/",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 806, hash: 'cfdaafe4775c32eefb2ccf884cab1ebbb15b65a064e98a40db2f88d35dfb9174', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1090, hash: 'e6d67b654275c0a40afba562c1196e4042639ba3be19a80866316df1f6a9879e', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'login/index.html': {size: 10723, hash: '1b9e824b29a17f94df4355bf587b60d5eb19f133ad0ed837efaf69ed5623d0e0', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'debug-auth/index.html': {size: 7402, hash: '63e3ba009477d8241b36475af51a1aacd2cd4f04dda560ec8cf7e2dddbe9a503', text: () => import('./assets-chunks/debug-auth_index_html.mjs').then(m => m.default)},
    'auth-callback/index.html': {size: 8067, hash: 'e5cb5dfd2a1625bafa19e420cbfd2f66c8fa1da06e42e06c49bc57c0c18b865f', text: () => import('./assets-chunks/auth-callback_index_html.mjs').then(m => m.default)},
    'hours-list/index.html': {size: 10723, hash: '1b9e824b29a17f94df4355bf587b60d5eb19f133ad0ed837efaf69ed5623d0e0', text: () => import('./assets-chunks/hours-list_index_html.mjs').then(m => m.default)},
    'calendar/index.html': {size: 10723, hash: 'd54267fba87524ede26399d6178a1dad5885ccb660fb2c7651f205826d5e2c12', text: () => import('./assets-chunks/calendar_index_html.mjs').then(m => m.default)},
    'profile/index.html': {size: 10723, hash: '1b9e824b29a17f94df4355bf587b60d5eb19f133ad0ed837efaf69ed5623d0e0', text: () => import('./assets-chunks/profile_index_html.mjs').then(m => m.default)},
    'declarations/index.html': {size: 10723, hash: 'd54267fba87524ede26399d6178a1dad5885ccb660fb2c7651f205826d5e2c12', text: () => import('./assets-chunks/declarations_index_html.mjs').then(m => m.default)},
    'index.html': {size: 12412, hash: '922feddbc469e8b9ba1199d27dda31b24a273161f0546ad363ef5a7ae7020d0c', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-U6P6IQJK.css': {size: 104, hash: 'oBTfB0AcxLw', text: () => import('./assets-chunks/styles-U6P6IQJK_css.mjs').then(m => m.default)}
  },
};
