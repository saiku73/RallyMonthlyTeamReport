//Notice how everything in Ext.define is a name value pair including the functions.
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [ //array
        { //object 
            xtype: 'container',
            itemId: 'filter-pulldown-container', //just a programming convenience to find an item
            layout: {
                type: 'hbox', //horizontal box
            
            }
        }
        ],
    launch: function() {
        console.log("Calling _loadMonthPulldown");
        this._loadMonthPulldown();
        this._loadTeamsPulldown();
        
    },
    _loadMonthPulldown : function() {
         // Set up a model to use in our Store
        Ext.define('Month', {
            extend: 'Ext.data.Model',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'startDate',  type: 'string'},
                {name: 'endDate',    type: 'string'},
                {name: 'dateString', type: 'string'}   // 2014-01-01:2014-01-31
            ]});

        var myStore = Ext.create('Ext.data.Store', {
            model: 'Month',
            data: [
                { 'name': 'Jan 1st, 2014', 'startDate': '2014-01-01', 'endDate': '2014-01-31' },
                { 'name': 'Feb 1st, 2014', 'startDate': '2014-02-01', 'endDate': '2014-02-28' },
                { 'name': 'Mar 1st, 2014', 'startDate': '2014-03-01', 'endDate': '2014-03-31' }
                ]
            });
            
        var monthCombobox = Ext.create('Rally.ui.combobox.ComboBox', {
            itemId: "month-combobox", //we'll use this item id to get the user's selection
            fieldLabel: "Month",
            labelAlign: "right",
            displayField: 'name',
            valueField: 'startDate',
            width: 300,
            store: myStore,
            listeners: {
                select: this._onMonthSelected, //combo and records will be passed in automatically
                scope : this //This is confusing ....it sets scope to the Ext object.
            }
        }
        );
        this.down('#filter-pulldown-container').add(monthCombobox);
    },
    _onMonthSelected: function(combo, records) {
        console.log('selected month', records[0].get('startDate'), records[0].get('endDate'));
    },
    _loadTeamsPulldown : function() {
        var teamCombobox = Ext.create('Rally.ui.combobox.ComboBox', {
            itemId: "team-combobox", //we'll use this item id to get the user's selection
            fieldLabel: "Team",
            labelAlign: "right",
            width: 300,
            storeConfig: {
                //This is where you bind to the Rally data
                autoLoad: true,
                model: 'Project', //maps to a "team"
                filters: [ //array of filters
                {
                    property: 'Name',
                    operator: '!contains',
                    value: 'Deprecated'
                }
                    ]
            },
            listeners: {
                select: this._onTeamSelected, //combo and records will be passed in automatically
                scope : this //This is confusing ....it sets scope to the Ext object.
            }
        }
        );
        this.down('#filter-pulldown-container').add(teamCombobox);
    },
    _onTeamSelected : function(combo, records) {
        console.log('%s team was selected', records[0]); //Use this if you don't know what properties u want. It will pretty print in the console.
        console.log('%s team was selected', records[0].get('Name'));
        
    }
});
