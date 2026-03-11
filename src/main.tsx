import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { Game } from './core/Game';
import './styles/ui.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const gameContainer = document.createElement('div');
gameContainer.style.width = '100%';
gameContainer.style.height = '100%';
rootElement.appendChild(gameContainer);

const uiContainer = document.createElement('div');
rootElement.appendChild(uiContainer);

const game = new Game(gameContainer);
void game.init();

window.addEventListener('beforeunload', () => game.dispose());

ReactDOM.createRoot(uiContainer).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
