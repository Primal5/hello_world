import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { Game } from './core/Game';
import './styles/ui.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const preventBrowserUi = (event: Event): void => {
  event.preventDefault();
};

document.addEventListener('contextmenu', preventBrowserUi);
document.addEventListener('selectstart', preventBrowserUi);
document.addEventListener('dragstart', preventBrowserUi);

const gameContainer = document.createElement('div');
gameContainer.style.width = '100%';
gameContainer.style.height = '100%';
rootElement.appendChild(gameContainer);

const uiContainer = document.createElement('div');
rootElement.appendChild(uiContainer);

const game = new Game(gameContainer);
void game.init();

window.addEventListener('beforeunload', () => {
  document.removeEventListener('contextmenu', preventBrowserUi);
  document.removeEventListener('selectstart', preventBrowserUi);
  document.removeEventListener('dragstart', preventBrowserUi);
  game.dispose();
});

ReactDOM.createRoot(uiContainer).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);