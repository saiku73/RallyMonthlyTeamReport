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
        },
        {
            xtype: 'container',
            itemId: 'grid-container',
            margin: '0 0 0 50'   // top, right, bottom, left
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
        this.selectedStartDate = records[0].get('startDate');
        this.selectedEndDate = records[0].get('endDate');
        this._fetchIterations();
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
        console.log(records[0]);
        this.selectedTeam = records[0].get('_ref'); //You may think you should use the Name property. You will be wrong.
        this._fetchIterations();
    },
    _fetchIterations : function()
    {
        Ext.create('Rally.data.wsapi.Store', {
            //configuration object
            model: 'Iteration',
            filters: [
                {
                //Iteration Start Date >= Month Start Date and Iteration End Date <= Month End Date
                property: 'StartDate',
                operator: '>=',
                value: this.selectedStartDate
                },
                {
                    property: 'EndDate',
                    operator: '<=',
                    value: this.selectedEndDate
                },
                {
                    property: 'Project', //selected team ref. 
                    operator: '=',
                    value: this.selectedTeam
                }
                ],
            autoLoad: true,
            listeners: {
                load: this._onIterationsLoaded,
                scope: this
            }
        });
    },
    _onIterationsLoaded : function(store, records, successful)
    {
        console.log('got iterations',records);
        //Using Lo-Dash library here. It's a useful lib for data analysis
        //lodash.com/docs#forEach
        this.Iterations = records;
        //_.each(records,function(record) {console.log('%s %s %s',record.get('Name'),record.get('StartDate'),record.get('EndDate'))});
        this._loadStories();
        
    },
    _loadStories : function() {
        console.log('Loading stories');
        
        var iterationFilters = null;
        
        // no stories in iteration, this report is of no use!   TODO: display a message 
        if (this.Iterations.length === 0) {
            return;
        }
        

        var iterFilter1 = Ext.create('Rally.data.wsapi.Filter', {
                property: 'Iteration',
                operator: '=',
                value: this.Iterations[0].get('_ref')
            });
        iterationFilters = iterFilter1;
        
        // TODO: loop through iterations and dynamically create OR logic
        if (this.Iterations.length > 1) {
        var iterFilter2 = Ext.create('Rally.data.wsapi.Filter', {
                property: 'Iteration',
                operator: '=',
                value: this.Iterations[1].get('_ref')
            });
            iterationFilters = iterFilter1.or(iterFilter2);
        }
        
        console.log('iteration filters', iterationFilters.toString());
        
        Ext.create('Rally.data.wsapi.Store' , {
            model : 'User Story' , //This is called "HierarchicalRequirement" in the rally docs ! - Gotcha
            autoLoad: true,
            context: {
              project: this.selectedTeam    // ODD: not setting specific project becomes greedy for single iteration that shares a name with several projects ?!?!?
            },
            fetch: ['Feature', 'Name', 'Notes', 'PercentDoneByStoryPlanEstimate', 'Parent'],
            filters: [iterationFilters],
            listeners : {
                load : this._onStoriesLoaded,
                scope: this //tells the runtime to use the parent "customapp" scope.
            }
        });
    },
    _onStoriesLoaded : function(store, storyRecords, success) {
        console.log('got %i stories', storyRecords.length);
        this._getUniqueFeatures(storyRecords);
    },
    _getUniqueFeatures : function(storyRecords) {
        var featureList = {};
        _.each(storyRecords, function(record) {
                            console.log("%s", record.get('Name'), record );
                var feature = record.get('Feature');
                
                if (feature === null) {
                    featureRef = "NoFeature";
                    featureList[featureRef] = { "Name": "No Feature Assigned" }
                } else {
                    var featureRef = feature["_ref"];
                    featureList[featureRef] = feature;
                }
                
                console.log(featureRef, feature, featureList);
            });
         
         this._getUniquePrograms(featureList);   
    },
    _getUniquePrograms : function(featureList) {
        console.log("_getUniquePrograms is running");
        var featureKeys = _.keys(featureList); //Get array of unique feature reference key.
        console.log("%s features found", featureKeys.length);
        var programList = {};
        _.each(featureKeys, function(featureKey) { 
            var program = featureList[featureKey].Parent;
            console.log(featureList[featureKey], ' from program ' , program);
            //put a key value into a unique list of programs
            if (program == null)
            {
                programRef = "NoProgram";
                programList[programRef] = { "Name": "No Program Assigned"}
            }
            else
            {
                programRef = program['_ref'];
                programList[programRef] = program;
            }
            
        });
        
        console.log('Program List: ', programList);
        this._loadView(featureList, programList);
        
        
    },
    _loadView : function(featureList, programList) {
        //console.log(featureList, programList);
        
        featureRows = [];
        _.each(_.keys(featureList), function(featureKey) {
                feature = featureList[featureKey];

                var programName;
                
                if (feature.Parent === undefined) {
                    programName = "No Program";
                } else {
                    programName = feature.Parent.Name;
                }
                
                var featureNotes = (feature.Notes === undefined)? "" : feature.Notes;
console.log("GOT!", feature, feature.Name);
                featureRows.push({ 'program': programName, 'feature': feature.Name, 'overallProgress': feature.PercentDoneByStoryPlanEstimate, 'notes': featureNotes});
        });
        
          // Set up a model to use in our Store
        Ext.define('ReportModel', {
            extend: 'Ext.data.Model',
            fields: [
                {name: 'program', type: 'string'},
                {name: 'feature',  type: 'string'},
                {name: 'notes',    type: 'string'},
                {name: 'overallProgress', type: 'string'}
            ]});

        var myStore = Ext.create('Ext.data.Store', {
            model: 'ReportModel',
            data: featureRows
            });

        if (this.grid !== undefined)
        {
         this.grid.destroy();   
        }
         this.grid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'Montly Team Report',
                        itemId: 'featuresGrid',
                        columnLines: true,
                        header: false,
                        showRowActionsColumn: false,
                        store: myStore,
                        width: 1000,
                        border: 1,
                        columnCfgs: [
							{ text: 'Program', dataIndex: 'program', sortable: true,   flex: 2 },							
							{ text: 'Feature', dataIndex:'feature', sortable: true,   flex: 2 },
							{ text: 'Overall Progress', dataIndex:'overallProgress', flex: 1, renderer: this._renderOverallProgress, scope: this, sortable: true,   width: 50 },
							{ text: 'Notes', dataIndex:'notes', sortable: false,   flex: 5 },
                        ],
                        viewConfig: {
                            enableTextSelection: true
                        }
                    });
        this.down('#grid-container').add(this.grid);
    },
    _renderOverallProgress: function(value, metaData, record, rowIndex, colIndex, store, view) {
                    var percentValue = (value * 100).toFixed(2);
                    
                    return Ext.String.format("{0}", percentValue);	
		        },
});
