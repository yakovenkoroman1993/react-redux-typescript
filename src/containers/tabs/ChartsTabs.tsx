import * as React from "react";
import RegionsPiesCharts from "./../regions-pies-charts/RegionsPiesCharts";
import RequestsDiagram from "./../monitoring/RequestsDiagram";
import {CpuChart} from "./../cpu-chart/CpuChart";
import {Tabs, Tab} from 'material-ui/Tabs';
import SwipeableViews from 'react-swipeable-views';
import {connect} from "react-redux";

function mapStateToProps(state) {
    const {stopwatch} = state;

    return {
        stopwatch
    };
}

class ChartsTabs extends React.Component<any, any> {
    constructor() {
        super();

        this.state = {
            slideIndex: 0,
            visibility: 'hidden',
        };
    }

    handleChange = (slideIndex) => {
        this.setState({slideIndex});
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.stopwatch === 'start') {
            this.setState({visibility: 'visible'});
        }
    }

    render() {
        const {handleChange} = this;
        const {slideIndex, visibility} = this.state;
        const tabs = [
            <RegionsPiesCharts key={0}/>,
            <RequestsDiagram key={1}/>,
            //<CpuChart key={2}/>
        ];

        return (
            <div style={{...tabsBlockStyle, ...{visibility}}} id="tabs-content">
                <Tabs onChange={handleChange} value={slideIndex}>
                    <Tab label="Регионы" value={0} />
                    <Tab label="Запросы" value={1} />
                    {/*
                     <Tab label="Нагрузка" value={2} />
                    */}
                </Tabs>
                <SwipeableViews
                    index={slideIndex}
                    onChangeIndex={handleChange}
                    slideStyle={{overflowY: 'hidden'}}
                >
                    {tabs}
                </SwipeableViews>
            </div>
        )
    }
}

const tabsBlockStyle = {
    alignSelf: 'stretch',
    height: 'calc(100% - 55px)'
};

export default connect(mapStateToProps)(ChartsTabs);