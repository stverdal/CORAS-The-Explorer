import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import App from './js/App.js';
import verifyMarkdownTables from './js/markdownCompat.js';
import Store from './js/store/Store.js';

verifyMarkdownTables();

ReactDOM.render(<Provider store={Store} ><App /></Provider>, document.getElementById('app'));
