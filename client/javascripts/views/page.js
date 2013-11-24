///////////////////////////////////////////////////////////////////////////////
// Page

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

Template.page.events({
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Main Map

Template.mainMap.mapType = function () {
  // var group = ReactiveGroupFilter.get("group");
  // var activity = ReactiveGroupFilter.get("activity");

  // return _.isNull(activity) ? (_.isNull(group) ? "home" : "feed") : "activity";
};