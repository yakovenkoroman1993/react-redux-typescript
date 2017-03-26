import * as React from "react";

import "./monitoring.css";
import {connect} from "react-redux";
import {Monitor, Life} from "../../../typings/todo";
import ChartOptions = CanvasJS.ChartOptions;
import ChartDataPoint = CanvasJS.ChartDataPoint;
import {initialLifeDataCompleted} from "../../actions/index";

const CanvasJS = require('canvasjs/dist/canvasjs.js');

interface MonitoringProps {
    monitor: any;
    monitorItem: Monitor.Item;
    lifeData: Life.Params;
    dispatch(...args);
}

function mapStateToProps(state, props) {
    return state;
}

class MonitoringConnectable extends React.Component<MonitoringProps, React.ComponentState> {

    chartId = 'life-rt-chart';

    chart: CanvasJS.Chart;

    dataPoints: Array<CanvasJS.ChartDataPoint> = [];

    constructor() {
        super();
    }

    initChart(initialLifeData:Life.Params) {

        this.clearMonitor();

        const { dataPoints } = this;
        let { nClients, nServers, requestsLimit } = initialLifeData;

        for (let i = 0; i < nServers; i++) {
            dataPoints.push({
                x: i,
                y: 0,
                label: `Server ${ i + 1 }`
            })
        }

        const maximum = requestsLimit * nClients + 5;

        this.chart = new CanvasJS.Chart(this.chartId, {
            title :{
                text: "Обработка клиентских запросов"
            },
            axisY: {
                gridThickness: 0,
                minimum: 0,
                maximum
            },
            data: [{
                type: "column",
                bevelEnabled: true,
                indexLabel: "{y}",
                dataPoints
            }]
        });
    }

    clearMonitor() {
        // Warning! Can not dataPoints = []
        while (this.dataPoints.pop()) {}
    }

    componentWillReceiveProps(props: MonitoringProps) {

        const {monitorItem, lifeData, dispatch} = props;
        if (lifeData && lifeData.actual) {
            this.initChart(lifeData);
            dispatch(initialLifeDataCompleted());
        }

        if (monitorItem && this.dataPoints[monitorItem.id]) {
            this.dataPoints[monitorItem.id].y = monitorItem.requestCounter;
        }

        const {chart} = this;
        if (chart) {
            chart.render();
        }
    }

    render() {

        return (
            <div id={ this.chartId }></div>
        );
    }
}

export const Monitoring = connect(mapStateToProps)(MonitoringConnectable);