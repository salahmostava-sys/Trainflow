window.IBTA_START_LANGUAGE='ar';
try{window.IBTA_START_LANGUAGE=JSON.parse(localStorage.getItem('ibta_ui_preferences')||'{}')?.uiLang==='en'?'en':'ar';}catch{}
const initialRoot=document.getElementById('html-root');initialRoot.lang=window.IBTA_START_LANGUAGE;initialRoot.dir=window.IBTA_START_LANGUAGE==='ar'?'rtl':'ltr';
window.IBTA_SIDEBAR_OPEN=!window.matchMedia?.('(max-width:760px)')?.matches;
try{const savedSidebar=localStorage.getItem('trainflow_sidebar_open');if(savedSidebar!==null)window.IBTA_SIDEBAR_OPEN=savedSidebar==='1';}catch{}
initialRoot.dataset.sidebar=window.IBTA_SIDEBAR_OPEN?'open':'closed';
window.IBTA_SIDEBAR_COMPACT=false;
try{window.IBTA_SIDEBAR_COMPACT=localStorage.getItem('trainflow_sidebar_compact')==='1';}catch{}
initialRoot.dataset.sidebarSize=window.IBTA_SIDEBAR_COMPACT?'compact':'expanded';
if(window.history)window.history.scrollRestoration='manual';
