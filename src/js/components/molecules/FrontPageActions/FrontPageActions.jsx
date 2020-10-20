import React from 'react';
import { HashRouter, Route, Link } from 'react-router-dom'; 

import './frontpageactions.css';

import Button from '../../atoms/Button/Button.jsx';


//<Button link={leftLink.path} text={leftLink.text} type="cta" minWidth="11rem" />
//<Button link={rightLink.path} text={rightLink.text} type="cta" minWidth="11rem" />
//<Route path={'/try-it'} component={EditorPage} />

//<Link to='/quick-start'>
//<Button text="Quick start" type="cta" minWidth="11rem" />
//</Link>

const FrontPageActions = () =>
        <nav className="fp-actions">
            <div className="fp-left">
            </div>
            <div className="fp-right">
                <Link to='/try-it'>
                    <Button text="Try CORAS" type="cta" minWidth="11rem" />
                </Link>
            </div>
        </nav>;

export default FrontPageActions;