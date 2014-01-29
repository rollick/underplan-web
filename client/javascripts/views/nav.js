///////////////////////////////////////////////////////////////////////////////
// Main Nav

Template.mainNav.rendered = function () {
  $(document).foundation('topbar');
};

Template.mainNav.helpers({
  group: function () {
    return Groups.findOne(ReactiveGroupFilter.get("group"));
  },
  groupNavTitle: function () {
    var groupId = ReactiveGroupFilter.get("group"),
        country = ReactiveGroupFilter.get("country"),
        group = Groups.findOne(groupId),
        data= {};

    if (group) {
      var slug = group.slug;
      if (country)
        slug = slug + "/c/" + encodeURIComponent(country.replace(/\s/, "-"))

      data = {
        slug: slug,
        name: !!country ? group.name + " - " + country : group.name
      };
    }
    
    return data;
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
    var groupId = ReactiveGroupFilter.get("group"),
        groupInfo = GroupInfo.findOne(groupId);

    if (groupInfo)
      return _.keys(groupInfo.counts).sort();
    else
      return [];
    return groupCountries(ReactiveGroupFilter.get("group"));
  }
});

Template.countryFilter.events({
  'mouseleave #country-filter': function (event, template) {
    if (template._inactiveTimer)
      clearTimeout(template._inactiveTimer);

    template._inactiveTimer = setTimeout(function () {
      var content = $(event.target);
      content.foundation('dropdown', 'close', content);
    }, 1000);
  },
  'mouseenter #country-filter': function (event, template) {
    if (template._inactiveTimer)
      clearTimeout(template._inactiveTimer);
  },
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

    App.followCurrentGroup(!followed);
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
    return !!Meteor.user() && !App.belongsToGroup()
  }, 
  followedCls: function () {
    return App.isFollowingGroup(Meteor.userId(), ReactiveGroupFilter.get("group")) ? "followed" : "";
  }
});

