///////////////////////////////////////////////////////////////////////////////
// Main Nav

Template.mainNav.appVersion = function () {
  return Session.get("appVersion");
};

Template.mainNav.group = function () {
  return Groups.findOne(Session.get("groupId"));
};

Template.mainNav.events({
  'click .home': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Sub Nav

Template.subNav.showCountryFilter = function () {
  return groupCountries(Session.get("groupId")).length > 1;
};

Template.subNav.countries = function () {
  return groupCountries(Session.get("groupId"));
};

Template.subNav.events({
  "click .country-filter a": function (event, template) {
    var filterElem = $(template.find(".country-filter"));
    var selected = event.target.text;
    var filter = {group: Session.get("groupId")}; 
    var targetElem = $(event.target);

    // set filter
    if(! targetElem.hasClass("all")) {
      $.extend(filter, {country: targetElem.text()});
    }
    logIfDev("FeedFilter set here (3)");
    Session.set("feedFilter", filter);
    Session.set("feedLimit", feedLimitSkip);

    Router.setGroup(getCurrentGroup());
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activity actions

Template.activityActions.events({
  "click .follow-group a": function (event, template) {
    var followed = $(template.find("a")).hasClass("followed");

    followCurrentGroup(!followed);
    return false;
  }
});

Template.activityActions.isNewRoute = function () {
  var fragment = Backbone.history.fragment;
  if(!fragment)
    return false;

  return !!(fragment.match(/\/new/));
};

Template.activityActions.userCanFollow = function () {
  // can follow if logged in but not a group member
  return !!Meteor.user() && !currentUserBelongsToCurrentGroup()
};

Template.activityActions.followingGroup = function () {
  return isFollowingGroup(Meteor.userId(), Session.get("groupId"));
};

Template.activityActions.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};
