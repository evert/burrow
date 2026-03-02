
const gopherTypeClassNames = {
  '0': 'text-file',
  '1': 'directory',
  'i': 'info',
};


// Preload
[
  '/gopher.webp',
  '/gopher-frozen.webp',
].forEach(src => {
  const img = new Image();
  img.src = src;
});
new Image('/gopher.webp');
new Image('/gopher-frozen.webp');

class BurrowWindow extends HTMLElement {

  loaderElem = null;
  currentUrl = 'gopher://gopher.floodgap.com/';
  addressElem = null;

  constructor() {
    super();
  }

  connectedCallback() {

    const addressBar = this.querySelector('.address-bar');
    addressBar.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      this.loadURL(formData.get('address'));
    });
    this.addressElem = addressBar.querySelector('input[name="address"]');
    this.loaderElem = this.querySelector('nav img');
    this.loadURL(this.currentUrl);

    this.querySelector('button.back').addEventListener('click', () => {
      history.back();
    });
    this.querySelector('button.forward').addEventListener('click', () => {
      history.forward();
    });
    this.querySelector('button.home').addEventListener('click', () => {
      this.loadURL('gopher://hole.din.gy/')
    });
    this.querySelector('button.reload').addEventListener('click', () => {
      this.loadURL(this.currentUrl);
    });
    window.addEventListener('hashchange', (_event) => {
      this.loadURL(window.location.hash.slice(1));
    });

  }

  async loadURL(url) {

    const urlObj = new URL(url);
    if (urlObj.protocol !== 'gopher:') {
      alert('Only gopher URLs are supported');
      return;
    }
    if (urlObj.port === '70') urlObj.port = '';

    window.history.pushState({}, '', '/#' + urlObj.toString());
    this.addressElem.value = urlObj.toString();
    this.startLoading();
    const response = await fetchGopherResource(url);
    render(this.querySelector('.content'), response.gopherType, response.content);
    this.endLoading();

  }

  /**
   * We're extending how long the loader shows, because
   * gopher is really fast and we want to make sure people can
   * see the little guy.
   */
  loadTimer = null;

  startLoading() {

    clearTimeout(this.loadTimer);
    this.loaderElem.src = '/gopher.webp';


  }

  endLoading() {

    this.loadTimer = setTimeout(() => {
      this.loaderElem.src = '/gopher-frozen.webp';
    }, 1000);

  }

}
customElements.define('burrow-window', BurrowWindow);

async function fetchGopherResource(url) {

  const resp = await fetch('/proxy/' + encodeURIComponent(url));

  if (!resp.ok) {
    if (resp.headers.get('Content-Type')?.startsWith('application/json')) {
      const errorData = await resp.json();
      throw new Error(errorData.error);
    } else {
      throw new Error('Failed to fetch gopher resource: ' + resp.status + ' ' + resp.statusText);
    }
  }

  const type = new URL(url).pathname.slice(1,2) || '1';

  return {
    gopherType: type,
    content: await resp.text()
  }

}

function render(element, gopherType, content) {

  switch(gopherType) {
    case '0': // text file
      element.textContent = content;
      break;
    case '1': // directory
      renderDirectory(element, content);
      break;

    default:
      element.textContent = 'Unsupported gopher type: ' + gopherType;
  }

}

function renderDirectory(parentElem, content) {

  parentElem.textContent = '';
  for (const line of content.split('\n')) {
    if (!line) {
      continue;
    }
    if (line[0] === '.') {
      break;
    }
    const type = line[0];
    const [display, selector, host, port] = line.slice(1).split('\t');

    const lineElem = document.createElement('div');
    lineElem.attributes['data-gophertype'] = type;
    if (gopherTypeClassNames[type]) {
      lineElem.classList.add(gopherTypeClassNames[type]);
    }
    switch(type) {
      case '0' : // text file
      case '1' : { // directory
        const link = document.createElement('a');
        link.href = new URL('gopher://' + host + ':' + port + '/' + type + selector).href;
        link.textContent = display;
        lineElem.appendChild(link);
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const url = link.href;
          parentElem.closest('burrow-window').loadURL(url);
        });
        break;
      }
      case 'h': {
        if (selector.startsWith('URL:')) {
          const url = selector.slice('URL:'.length);
          const link = document.createElement('a');
          link.href = url;
          link.textContent = display;
          link.target = '_blank';
          lineElem.appendChild(link);
          break;
        } else {
          lineElem.classList.add('error');
          lineElem.textContent = 'Unsupported h-line. Should start with URL:';
          break;
        }
      }
      case 'i': // info
        lineElem.textContent = display;
        break;
      default:
        lineElem.classList.add('error');
        lineElem.textContent = 'Unsupported gopher type: ' + type;

    }
    parentElem.appendChild(lineElem);


  }

}
