
const gopherTypeClassNames = {
  '0': 'text-file',
  '1': 'directory',
  '3': 'error',
  '7': 'search',
  'h': 'html-link',
  'i': 'info',
  'I': 'image',
};


// Preload
[
  '/gopher.webp',
  '/gopher-frozen.webp',
  '/gopher-gasp.gif',
].forEach(src => {
  const img = new Image();
  img.src = src;
});

class BurrowWindow extends HTMLElement {

  loaderElem = null;
  currentUrl = 'gopher://hole.din.gy/1/burrow-landing';
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
    if (window.location.hash) {
      this.currentUrl = window.location.hash.slice(1);
    }
    this.loadURL(this.currentUrl);

    this.querySelector('button.back').addEventListener('click', () => {
      history.back();
    });
    this.querySelector('button.forward').addEventListener('click', () => {
      history.forward();
    });
    this.querySelector('button.home').addEventListener('click', () => {
      this.loadURL('gopher://hole.din.gy/1/burrow-landing');
    });
    this.querySelector('button.reload').addEventListener('click', () => {
      this.loadURL(this.currentUrl);
    });
    this.loaderElem.addEventListener('click', () => {
      this.loaderElem.src = '/gopher-gasp.gif';
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

    this.currentUrl = urlObj.toString();
    window.history.pushState({}, '', '/#' + urlObj.toString());
    this.addressElem.value = urlObj.toString();
    this.startLoading();
    const gopherType = urlObj.pathname.slice(1,2) || '1';
    render(
      this.querySelector('.content'),
      gopherType,
      url,
    );
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

  const resp = await fetch(gopherToProxyUrl(url));

  if (!resp.ok) {
    if (resp.headers.get('Content-Type')?.startsWith('application/json')) {
      const errorData = await resp.json();
      throw new Error(errorData.error);
    } else {
      throw new Error('Failed to fetch gopher resource: ' + resp.status + ' ' + resp.statusText);
    }
  }

  return resp;

}

async function fetchGopherText(url) {

  return await (await fetchGopherResource(url)).text();

}

function gopherToProxyUrl(gopherUrl) {
  return '/proxy/' + encodeURIComponent(gopherUrl);
}

async function render(element, gopherType, url) {

  try {
    switch(gopherType) {
      case '0': // text file
        element.textContent = await fetchGopherText(url);
        break;
      case '1': // directory
      case '7': // search
        renderDirectory(element, await fetchGopherText(url));
        break;
      case 'I' : // image
        const img = document.createElement('img');
        img.src = gopherToProxyUrl(url);
        element.replaceChildren(img);
        break;

      default:
        element.textContent = 'Unsupported gopher type: ' + gopherType;
    }
  } catch (err) {
    const errDiv = document.createElement('div');
    errDiv.textContent = 'Error loading gopher resource: ' + err.message;
    errDiv.classList.add('error');
    element.replaceChildren(errDiv);
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
      case '3': {
        lineElem.textContent = display;
        break;
      }
      case '7': {
        const form = document.createElement('form');
        const label = document.createElement('label');
        label.textContent = display + ': ';
        const input = document.createElement('input');
        input.type = 'search';
        const button = document.createElement('button');
        button.type = 'submit';
        button.textContent = 'Go';
        form.appendChild(label);
        form.appendChild(input);
        form.appendChild(button);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const gopherUrl = new URL('gopher://' + host + ':' + port + '/7' + selector);
          gopherUrl.search = input.value;
          parentElem.closest('burrow-window').loadURL(gopherUrl.toString());
        });
        lineElem.appendChild(form);
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
        if (selector === 'TITLE') {
          lineElem.classList.add('title');
        }
        break;
      case 'I': {
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
      } default:
        lineElem.classList.add('error');
        lineElem.textContent = 'Unsupported gopher type: ' + type;

    }
    parentElem.appendChild(lineElem);


  }

}
