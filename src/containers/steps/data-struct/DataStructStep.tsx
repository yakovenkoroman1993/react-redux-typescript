import * as React from "react";
import "./data-struct-step.css";
import styles from "./data-struct-step.styles";
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField'
import AutoComplete from '../../../components/AutoCompleteSyntheticable'
import Checkbox from 'material-ui/Checkbox';

import FormDataService from './../../../services/FormData'

import {DesignReplicator} from '../../../components/design-replicator/DesignReplicator';
import {connect} from "react-redux";
import {updateOtherStepsData} from "../../../actions/index";

@connect()
class DataStructStep extends React.Component<any, any> {

    fds: FormDataService;

    state = {
        pathSource: []
    };

    typesSource = [{
        text: 'Строковый',
        value: 'string'
    }, {
        text: 'Числовой',
        value: 'integer'
    }];

    typeByTextMap = {
        'Строковый': 'string',
        'Числовой': 'integer'
    };

    defaultStepData = {
        tables: [{
            name: '',
            fields: [{
                name: '',
                type: null
            }]
        }]
    };

    constructor(props) {
        super();

        const {defaultStepData} = this;
        const { formDataService } = props;
        formDataService.setData(defaultStepData);
        this.fds = formDataService;
    }

    handleFormChange = (event) => {
        const {target} = event;
        const {fds} = this;

        if (target.name) {
            fds.setDataByPath(target.name, target.value);
        }

        this.props.dispatch(updateOtherStepsData({
            tables: fds.data.tables
        }));
    };

    onAutoCompleteUpdate = (value, _, target) => {
        const {fds, typeByTextMap} = this;
        const name = target['name'];
        fds.setDataByPath(name, typeByTextMap[value]);
    };

    externalCheckHandle = (event, checked) => {
        event.currentTarget.value = checked;
        this.handleFormChange(event);
    };

    primaryCheckHandle = (event, checked) => {
        event.currentTarget
            .closest('.data-struct-index-paper')
            .querySelector('.data-struct-external-index-checkbox')
            .querySelector('input')
            .disabled = checked;

        event.target.value = checked;
        this.handleFormChange(event);
    };

    // onReplicaRemove = (index, hint, path) => {
    //     const {fds} = this;
    //     const {dispatch} = this.props;
    //     fds.removeArrayElem(index, hint, path);
    //
    //     dispatch(updateOtherStepsData({
    //         tables: fds.data.tables
    //     }));
    // };

    render() {

        const {
            onAutoCompleteUpdate,
            externalCheckHandle,
            primaryCheckHandle,
            // onReplicaRemove,
            handleFormChange,
            typesSource,
            fds
        } = this;

        const onReplicaRemove = fds.removeArrayElem.bind(fds);

        return (

            <form onChange={handleFormChange}>

                <DesignReplicator
                    hint="tables"
                    styles={ styles.tables }
                    onReplicaRemove={onReplicaRemove}
                >
                    <div>
                        <Paper className="data-struct-table-paper">
                            <TextField
                                name="tables.0.name"
                                defaultValue="my_table"
                                floatingLabelText="Введите имя таблицы"
                                fullWidth={true}
                            />

                            <DesignReplicator
                                styles={ styles.fields }
                                hint="fields"
                                onReplicaRemove={ onReplicaRemove }
                            >
                                <Paper className="data-struct-fields-paper">
                                    <div>
                                        <TextField
                                            hintText="Введите имя поля"
                                            style={styles.fields.textField}
                                            name="tables.0.fields.0.name"
                                        />

                                        <AutoComplete
                                            openOnFocus={true}
                                            filter={AutoComplete.noFilter}
                                            hintText="Укажите тип данных"
                                            dataSource={typesSource}
                                            style={styles.fields.autocompleteField}
                                            name="tables.0.fields.0.type"
                                            onUpdateInput={ onAutoCompleteUpdate }
                                        />

                                    </div>
                                    <div className="data-struct-index-paper">
                                        <span className="gray">Индексы</span>
                                        <Checkbox
                                            name="tables.0.fields.0.isPrimaryIndexed"
                                            onCheck={primaryCheckHandle}
                                            label="первичный"
                                            labelStyle={{color: 'rgba(0, 0, 0, 0.298039)'}}
                                        />
                                        <Checkbox
                                            name="tables.0.fields.0.isExternalIndexed"
                                            className="data-struct-external-index-checkbox"
                                            onCheck={externalCheckHandle}
                                            label="внешний"
                                            labelStyle={{color: 'rgba(0, 0, 0, 0.298039)'}}
                                        />
                                    </div>
                                </Paper>
                            </DesignReplicator>
                        </Paper>
                    </div>
                </DesignReplicator>
            </form>
        )
    }
}

export default DataStructStep;