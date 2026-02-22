/*User had 3 forms and 3 separate fields that collected the same information; wanting to display that field uniformly in the Homepage sesarch grid.
This merges 3 different forms with their respective form field indicatorID's into 1 column and added to view_search.tpl*/

{name: 'COLUMN_NAME', indicatorID: 'COLUMN_NAME', editable: false, callback: function(data, blob) {
    const formIndicatorMap = {
        'FORM_ID_1': INDICATOR_ID_1,
        'FORM_ID_2': INDICATOR_ID_2,
        'FORM_ID_3': INDICATOR_ID_3
    };
    const categoryIDs = blob[data.recordID].categoryIDs || [];
    let matchedIndicatorID = null;
    for(let i in categoryIDs) {
        if(formIndicatorMap[categoryIDs[i]] !== undefined) {
            matchedIndicatorID = formIndicatorMap[categoryIDs[i]];
            break;
        }
    }
    if(matchedIndicatorID === null) {
        document.querySelector(`#${data.cellContainerID}`).innerHTML = '';
        return;
    }
    const q = JSON.stringify({
        terms: [{ id: 'recordID', operator: '=', match: data.recordID }],
        joins: [],
        sort: {},
        getData: [matchedIndicatorID]
    });
    fetch(`api/form/query?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(result => {
            const record = result[data.recordID];
            const value = record && record.s1 && record.s1['id' + matchedIndicatorID]
                ? record.s1['id' + matchedIndicatorID]
                : '';
            document.querySelector(`#${data.cellContainerID}`).innerHTML = value;
        })
        .catch(() => {
            document.querySelector(`#${data.cellContainerID}`).innerHTML = '';
        });
}},
