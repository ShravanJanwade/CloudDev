
const consolePatchContent = `(function() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  function proxy(type, args) {
    try {
      const cleanArgs = args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch(e) {
          return String(arg);
        }
      });
      window.parent.postMessage({ type: 'console-log', level: type, args: cleanArgs }, '*');
    } catch (e) {}
  }

  console.log = function(...args) { originalLog.apply(console, args); proxy('log', args); };
  console.warn = function(...args) { originalWarn.apply(console, args); proxy('warn', args); };
  console.error = function(...args) { originalError.apply(console, args); proxy('error', args); };
  console.info = function(...args) { originalInfo.apply(console, args); proxy('info', args); };
  
  window.addEventListener('error', (e) => proxy('error', [e.message]));
})();`;

export const templates = {
  react: {
    name: 'React + Vite',
    icon: '⚛️',
    files: {
      'public': {
        directory: {
            '__clouddev_logger.js': {
                file: {
                    contents: consolePatchContent
                }
            }
        }
      },
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'react-project',
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview'
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0'
            },
            devDependencies: {
              '@vitejs/plugin-react': '^4.0.0',
              vite: '^4.4.0'
            }
          }, null, 2)
        }
      },
      'vite.config.js': {
        file: {
          contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
        }
      },
      'index.html': {
        file: {
          contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="/__clouddev_logger.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
        }
      },
      src: {
        directory: {
          'main.jsx': {
            file: {
              contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
            }
          },
          'App.jsx': {
            file: {
              contents: `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>Hello React!</h1>
      <button onClick={() => {
        setCount(c => c + 1);
        console.log('Counter incremented!', count + 1);
      }}>
        Count: {count}
      </button>
      <p style={{fontSize: '0.8rem', opacity: 0.7, marginTop: '1rem'}}>
        Open the Inspect panel to see logs!
      </p>
    </div>
  )
}

export default App`
            }
          },
          'index.css': {
            file: {
              contents: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, sans-serif;
  background: #1a1a2e;
  color: white;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 0.5rem;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #4338ca;
}`
            }
          }
        }
      }
    }
  },
  
  node: {
    name: 'Node.js',
    icon: '🟢',
    files: {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'node-project',
            version: '1.0.0',
            type: 'module',
            scripts: {
              start: 'node index.js',
              dev: 'node --watch index.js'
            }
          }, null, 2)
        }
      },
      'index.js': {
        file: {
          contents: `console.log('Hello from Node.js!');

// Simple HTTP server
import { createServer } from 'http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello World!</h1>');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});`
        }
      }
    }
  },

  vanilla: {
    name: 'Vanilla JS',
    icon: '📜',
    files: {
      'public': {
        directory: {
            '__clouddev_logger.js': {
                file: {
                    contents: consolePatchContent
                }
            }
        }
      },
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'vanilla-project',
            version: '1.0.0',
            scripts: {
              dev: 'vite',
              build: 'vite build'
            },
            devDependencies: {
              vite: '^4.4.0'
            }
          }, null, 2)
        }
      },
      'index.html': {
        file: {
          contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="/__clouddev_logger.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vanilla JS</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Hello World!</h1>
    <script type="module" src="main.js"></script>
  </body>
</html>`
        }
      },
      'style.css': {
        file: {
          contents: `body {
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

button {
    padding: 10px 20px;
    margin-top: 20px;
    cursor: pointer;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 5px;
    font-weight: bold;
}
`
        }
      },
      'main.js': {
        file: {
          contents: `console.log('Hello from JavaScript!');

// Add a button to test logs
const btn = document.createElement('button');
btn.textContent = 'Click to Log';
btn.onclick = () => {
    console.log('Button clicked at ' + new Date().toLocaleTimeString());
    console.warn('This is a test warning');
};
document.body.appendChild(btn);
`
        }
      }
    }
  }
};

export type TemplateKey = keyof typeof templates;
