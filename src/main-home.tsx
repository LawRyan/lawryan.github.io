import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import Home from './home/Home';
const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <Home />); else createRoot(root).render(<Home />);
