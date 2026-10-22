import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Mini } from './screens/Mini';
import { runExport, runReplay } from './replay';
import './styles.css';

if (location.search.includes('replay')) {
  document.body.textContent = 'Replaying test clips…';
  (location.search.includes('export') ? runExport() : runReplay()).catch((e) => window.deskwatch.replayResult('REPLAY ERROR: ' + e, '[]'));
} else if (location.search.includes('mini')) {
  createRoot(document.getElementById('root')!).render(<Mini />); // the mini timer window: no camera, no models
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
