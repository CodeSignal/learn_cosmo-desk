import './design-system/colors/colors.css';
import './design-system/spacing/spacing.css';
import './design-system/typography/typography.css';
import './design-system/components/button/button.css';
import './design-system/components/icons/icons.css';
import './design-system/components/input/input.css';
import './design-system/components/table/table.css';
import './theme/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
