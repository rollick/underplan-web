///////////////////////////////////////////////////////////////////////////////
// Main Nav

Template.mainNav.rendered = function () {
  $(document).foundation('topbar');
};

Template.mainNav.helpers({
  appVersion: function () {
    return Session.get("appVersion");
  },
  group: function () {
    return Groups.findOne(ReactiveGroupFilter.get("group"));
  },
  groupNavTitle: function () {
    var groupId = ReactiveGroupFilter.get("group"),
        country = ReactiveGroupFilter.get("country"),
        group = Groups.findOne(groupId),
        data = {};

    if (group) {
      data = {
        slug: group.slug,
        name: !!country ? group.name + " - " + country : group.name
      };
    }
    
    return data;
  }
});

Template.mainNav.events({
  'click .home': function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setGroup(Groups.findOne(ReactiveGroupFilter.get("group")));
  }
});

///////////////////////////////////////////////////////////////////////////////
// Sub Nav

Template.countryFilter.rendered = function () {
  $(this.firstNode).foundation('dropdown');
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
  "click #country-filter li > a": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var selectedElem = $(event.target),
        dropdown = selectedElem.closest("#country-filter"),
        group = Groups.findOne(ReactiveGroupFilter.get("group")),
        country = selectedElem.text();

    // On the feed list
    if(mappingFsm.equals("state", "hideMap")) {
      // Route to Feed List
      if (selectedElem.hasClass("all") || !country)
        Router.setGroupFeed(group);
      else
        Router.setGroupFeedAndCountry(group, country);
    } else {
      // Route to Map
      if (selectedElem.hasClass("all") || !country)
        Router.setGroup(group);
      else
        Router.setGroupAndCountry(group, country);
    }

    Foundation.libs.dropdown.close(dropdown);
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

