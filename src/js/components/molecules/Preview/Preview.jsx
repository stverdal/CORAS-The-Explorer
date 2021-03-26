import React from 'react';
import { Link } from 'react-router-dom'; 


import './preview.css';
import assetD from '../../../../img/asset_diagram_example.svg';
import threatD from '../../../../img/threat_diagram_example.svg';
import Button from '../../atoms/Button/Button.jsx';


const Preview = ({ tagLine }) =>
    <div className="preview">
        <div className="preview-wrapper">    
            <div className="preview-left">
                <img className="preview-left__image" src={assetD} />
            </div>
            <div className="preview-middle">
                {tagLine}
                <Link className="preview-middle-button" to='/try-it'>
                    <Button text="Try CORAS" type="cta" minWidth="11rem" />
                </Link>
            </div>
            <div className="preview-right">
                <img className="preview-right__image" src={threatD} />
            </div>
        </div>
    </div>;

export default Preview;