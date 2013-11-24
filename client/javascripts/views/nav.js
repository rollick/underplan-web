///////////////////////////////////////////////////////////////////////////////
// Main Nav

Template.mainNav.appVersion = function () {
  return Session.get("appVersion");
};

Template.mainNav.group = function () {
  return Groups.findOne(ReactiveGroupFilter.get("group"));
};

Template.mainNav.events({
  'click .home': function () {
    Router.setGroup(Groups.findOne(ReactiveGroupFilter.get("group")));
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Sub Nav

Template.countryFilter.showCountryFilter = function () {
  return groupCountries(ReactiveGroupFilter.get("group")).length > 1;
};

Template.countryFilter.helpers({
  currentCountry: function () {
    return ReactiveGroupFilter.get("country") || "All Countries";
  },
  countries: function () {
    return groupCountries(ReactiveGroupFilter.get("group"));
  }
});

Template.countryFilter.events({
  "click .country-filter li > a": function (event, template) {
    var filterElem = $(template.find("#country-filter"));
    var selectedElem = $(event.target);
    var selectedText = selectedElem.hasClass("all") ? null : selectedElem.text();
    
    
    ReactiveGroupFilter.set("country", selectedText);
    ReactiveGroupFilter.set("limit", feedLimitSkip);

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
  return isFollowingGroup(Meteor.userId(), ReactiveGroupFilter.get("group"));
};

Template.activityActions.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};
