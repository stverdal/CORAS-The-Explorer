import React from 'react';
import { HashRouter, Link } from 'react-router-dom'; 

import './keypoints.css';

const KeyPoint = ({ header, text, link }) =>
        <div className="key-point">
            <header>
                <h1 className="key-point__header">{header}</h1>
            </header>
            <p className="key-point__description">
                {text}
            </p>
            <div>
                <Link to={link}>
                    <div className="key-point__read-more-link">Read more <span className="icon-push-down icon-circle-right"></span></div>
                </Link>
            </div>
        </div>

const KeyPoints = ({ keyPoints }) =>
    <div className="key-points">
        {keyPoints.map((val, key) => <KeyPoint header={val.header} text={val.text} link={val.link} key={key} />)}
    </div>

export default KeyPoints;