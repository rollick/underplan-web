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

Template.countryFilter.showCountryFilter = function () {
  return groupCountries(Session.get("groupId")).length > 1;
};

Template.countryFilter.helpers({
  currentCountry: function () {
    return ReactiveFeedFilter.get("country") || "All Countries";
  },
  countries: function () {
    return groupCountries(Session.get("groupId"));
  }
});

Template.countryFilter.events({
  "click .country-filter li > a": function (event, template) {
    var filterElem = $(template.find("#country-filter"));
    var selectedElem = $(event.target);
    var selectedText = selectedElem.hasClass("all") ? null : selectedElem.text();
    
    // set filter
    var filter = {group: Session.get("groupId")};
    $.extend(filter, {country: selectedText});
    
    logIfDev("FeedFilter set here (3)");
    ReactiveFeedFilter.set("feedFilter", filter);
    ReactiveFeedFilter.set("limit", feedLimitSkip);

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
