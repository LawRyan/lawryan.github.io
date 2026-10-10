import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import LiosPage from './lios/LiosPage';
const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <LiosPage />); else createRoot(root).render(<LiosPage />);
