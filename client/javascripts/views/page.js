///////////////////////////////////////////////////////////////////////////////
// Templates

pageOptions = {
  currentActivity:  {highContent: true, singleItem: true},
  storyEditor:      {highContent: true, singleItem: true},
  shortyEditor:     {highContent: true, singleItem: true},
  activityFeed:     {highContent: true, isFeed: true},
  mainHome:         {highContent: true, isHome: true},
  permaShorty:      {highContent: true, singleItem: true}
};

///////////////////////////////////////////////////////////////////////////////
// Page
Template.page.helpers({
  mainTemplate: function () {
    var templateName = Session.get("mainTemplate");
    if (Session.get("mainTemplate")) {
      Session.set("pageOptions", pageOptions[templateName]);

      return Template[templateName]();
    } else {
      return "Loading...";
    }
  }
});

this.showTemplate = function (templateName, callback) {
  var conditions = this.appTemplates();

  _.each(_.keys(conditions), function (key) {
    // If is array then template includes template options
    var flag = null,
        options = {};
    if (_.isArray(conditions[key])) {
      flag = conditions[key][0];
      options = conditions[key][1];
    } else {
      flag = conditions[key];
    }

    if (key === templateName) {
      
      // Session.set(flag, true);
      Session.set('pageOptions', options)
    } else {
      Session.set(flag, false);
    }
  });

  if (_.isFunction(callback)) {
    callback();
  }
};


Template.page.appVersion = function () {
  return Session.get("appVersion");
};

Template.page.noGroup = function () {
  var group = Groups.findOne(ReactiveGroupFilter.get("group"));
  return group ? false : true;
};

Template.page.showGroup = function () {
  return !!ReactiveGroupFilter.get("group");
};

Template.page.groupName = function () {
  if (ReactiveGroupFilter.get("group")) {
    group = Groups.findOne(ReactiveGroupFilter.get("group"));
    if (group)
      return group.name;
  }
};

Template.page.pageOptions = function () {
  return Session.get("pageOptions");
};

Template.page.rendered = function () {
  logIfDev("++ Main Page Rendered");
};

Template.page.events({
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Main Map

Template.mainMap.events({
  "click .load-more": function (event, template) {
    ReactiveGroupFilter.set("limit", ReactiveGroupFilter.get("limit") + feedLimitSkip);
    return false;
  }
});

Template.mainMap.helpers({
  // count of activities shown on map is either the current set "limit", or the activities
  // count if it is less than the "limit", eg all activities have been fetched
  activityCount: function () {
    var groupId = ReactiveGroupFilter.get("group");
    var total = Activities.find({group: groupId}, {_id: 1}).count();
    var limit = ReactiveGroupFilter.get("limit") || 0;

    limit = total < limit ? total : limit;

    return limit + "/" + total;
  }
});

Template.mainMap.rendered = function () {
  logIfDev("++ Rendered main map: " + JSON.stringify(this.data));
};