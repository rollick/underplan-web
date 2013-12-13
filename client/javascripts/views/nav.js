///////////////////////////////////////////////////////////////////////////////
// Main Nav

Template.mainNav.helpers({
  appVersion: function () {
    return Session.get("appVersion");
  }
});

Template.mainNav.events({
  'click .home': function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setGroup(Groups.findOne(ReactiveGroupFilter.get("group")));
  }
});

Template.mainNav.group = function () {
  return Groups.findOne(ReactiveGroupFilter.get("group"));
};

Template.mainNav.groupNavTitle = function () {

  var group = Groups.findOne(ReactiveGroupFilter.get("group")),
      data = {};

  if (group) {
    data = {
      slug: group.slug,
      name: group.name
    };
  }

  return Template.navTitle.withData(data);
};

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
    event.stopPropagation();
    event.preventDefault();

    var selectedElem = $(event.target),
        group = Groups.findOne(ReactiveGroupFilter.get("group")),
        country = selectedElem.text();

    if (selectedElem.hasClass("all") || !country) {
      Router.setGroup(group);
    } else {
      Router.setGroupAndCountry(group, country);
    }

    selectedElem.closest("section, .section").removeClass("active"); 
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activity actions

Template.activityActions.events({
  "click .follow-group a": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var followed = $(template.find("a")).hasClass("followed");

    followCurrentGroup(!followed);
  }
});

Template.activityActions.helpers({
  isNewRoute: function () {
    var fragment = Backbone.history.fragment;
    if(!fragment)
      return false;

    return !!(fragment.match(/\/new/));
  },
  userCanFollow: function () {
    // can follow if logged in but not a group member
    return !!Meteor.user() && !currentUserBelongsToCurrentGroup()
  }, 
  followedCls: function () {
    return isFollowingGroup(Meteor.userId(), ReactiveGroupFilter.get("group")) ? "followed" : "";
  }
});

